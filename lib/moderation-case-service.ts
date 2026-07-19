import { sql } from '@/lib/db'
import { notifyAdminsInternal } from '@/lib/notification-service'
import {
  evaluateAntiSolicitation,
  type ModerationPolicyRule,
  type PolicyEvaluation
} from '@/lib/anti-solicitation-policy'

export type MessageModerationEvaluation = PolicyEvaluation & {
  shouldCreateCase: boolean
}

export async function evaluateMessageModeration(input: {
  senderId: string
  content: string
}): Promise<MessageModerationEvaluation> {
  const rules = await sql.query<ModerationPolicyRule[]>(
    `SELECT id, keyword, category, weight, phrase, active
     FROM moderation_keywords
     WHERE active = true
       AND policy_version = 'anti-solicitation-2026-07-15'`,
    []
  )

  if (!rules.length) {
    return {
      ...evaluateAntiSolicitation(input.content, []),
      shouldCreateCase: false
    }
  }

  const [repetition] = await sql.query<Array<{ count: string | number }>>(
    `SELECT COUNT(DISTINCT conversation_id) AS count
     FROM messages
     WHERE sender_id = $1
       AND created_at >= NOW() - INTERVAL '24 hours'
       AND lower(trim(content)) = lower(trim($2))`,
    [input.senderId, input.content]
  )
  const evaluation = evaluateAntiSolicitation(input.content, rules, {
    repeatedRecipientCount: Number(repetition?.count || 0)
  })

  return {
    ...evaluation,
    shouldCreateCase: evaluation.outcome !== 'allow'
  }
}

export async function createModerationCase(input: {
  conversationId: string
  senderId: string
  content: string
  sourceId?: string | null
  evaluation: MessageModerationEvaluation
}) {
  const retentionDays = input.evaluation.outcome === 'warn' ? 90 : 365
  const [moderationCase] = await sql.query<Array<{ id: string }>>(
    `WITH investigation AS (
       INSERT INTO moderation_investigations (subject_user_id, category, priority)
       VALUES ($2, 'paid_solicitation', 100)
       ON CONFLICT (subject_user_id) DO UPDATE SET
         category = 'paid_solicitation', priority = GREATEST(moderation_investigations.priority, 100), updated_at = NOW()
       RETURNING id
     )
     INSERT INTO moderation_queue (
        source_type, source_id, user_id, conversation_id, severity, status,
        reason, matched_keywords, excerpt, metadata, score, outcome,
        policy_version, subject_pseudonym, retention_until, investigation_id
      ) SELECT
        'message', $1, $2, $3, $4, 'new',
        'Signal contextuel de sollicitation sexuelle rémunérée', $5::text[], $6,
        $7::jsonb, $8, $9, $10, $11, NOW() + ($12::text || ' days')::interval, investigation.id
      FROM investigation
      RETURNING id`,
    [
      input.sourceId || null,
      input.senderId,
      input.conversationId,
      input.evaluation.severity,
      input.evaluation.matchedRuleIds,
      input.content.slice(0, 1000),
      JSON.stringify({
        categories: input.evaluation.matchedCategories,
        automationContributed: true
      }),
      input.evaluation.score,
      input.evaluation.outcome,
      input.evaluation.policyVersion,
      `Membre-${input.senderId.slice(0, 8)}`,
      retentionDays
    ]
  )

  if (!moderationCase) throw new Error('Dossier de modération indisponible')

  await notifyAdminsInternal({
    type: 'moderation_alert',
    title: 'Alerte de sécurité communautaire',
    description: 'Un dossier confidentiel attend un examen humain.',
    link: '/admin/moderation',
    category: 'moderation',
    priority: input.evaluation.severity === 'critical' ? 'critical' : 'high',
    createdBy: input.senderId,
    metadata: {
      caseId: moderationCase.id,
      severity: input.evaluation.severity
    }
  })

  return moderationCase
}
