import { getComplianceFlags } from '@/config/compliance'
import { hmacSensitiveValue } from '@/lib/compliance-audit'
import {
  ContactSafetyError,
  evaluateMemberContent,
  type SafetyEvaluation,
  type SafetySurface
} from '@/lib/contact-safety-policy'
import { sql } from '@/lib/db'
import { createAppNotificationInternal as createAppNotification } from '@/lib/notification-service'

export type EnforceMemberContentInput = {
  actorUserId: string
  surface: SafetySurface
  content: string
}

const inactiveEvaluation: SafetyEvaluation = {
  decision: 'allow',
  score: 0,
  categories: [],
  ruleIds: [],
  maskedExcerpt: '',
  engineVersion: 'contact-safety-disabled'
}

export async function enforceMemberContent(
  input: EnforceMemberContentInput
): Promise<SafetyEvaluation> {
  if (!getComplianceFlags().contactSafety) return inactiveEvaluation

  const evaluation = evaluateMemberContent({
    surface: input.surface,
    content: input.content,
    origin: 'member'
  })
  if (evaluation.decision === 'allow') return evaluation

  const contentHmac = hmacSensitiveValue(
    input.content.normalize('NFKC').toLocaleLowerCase('fr-FR')
  )
  await sql.query(
    `INSERT INTO compliance_safety_events (
       actor_user_id, surface, decision, categories, content_hmac,
       rule_ids, masked_excerpt, engine_version
     ) VALUES ($1, $2, $3, $4::text[], $5, $6::text[], $7, $8)
     RETURNING id`,
    [
      input.actorUserId,
      input.surface,
      evaluation.decision,
      evaluation.categories,
      contentHmac,
      evaluation.ruleIds,
      evaluation.maskedExcerpt,
      evaluation.engineVersion
    ]
  )

  const [attempts] = await sql.query<Array<{ attempt_count: number | string }>>(
    `SELECT COUNT(*) AS attempt_count
     FROM compliance_safety_events
     WHERE actor_user_id = $1
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
    [input.actorUserId]
  )

  if (Number(attempts?.attempt_count || 0) >= 3) {
    const [investigation] = await sql.query<Array<{ id: string }>>(
      `INSERT INTO moderation_investigations (subject_user_id, category, priority)
       VALUES ($1, 'external_contact', 90)
       ON CONFLICT (subject_user_id) DO UPDATE SET
         category = CASE
           WHEN moderation_investigations.category = 'paid_solicitation'
             THEN moderation_investigations.category
           ELSE 'external_contact'
         END,
         priority = GREATEST(moderation_investigations.priority, 90),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [input.actorUserId]
    )
    const reviewers = await sql.query<Array<{ id: string }>>(
      `SELECT id FROM users
       WHERE role = 'admin'
         AND COALESCE(is_banned, false) = false
         AND COALESCE(status, 'active') = 'active'`,
      []
    ) || []

    await Promise.all(reviewers.map(reviewer => createAppNotification({
      userId: reviewer.id,
      type: 'contact_safety_alert',
      title: 'Alerte de sécurité communautaire',
      description: 'Des tentatives répétées de sortie de la messagerie LHR nécessitent une revue humaine.',
      link: investigation?.id ? `/moderation/${investigation.id}` : '/admin/moderation',
      priority: 'high',
      category: 'moderation',
      audience: 'admin',
      metadata: investigation?.id ? { investigationId: investigation.id } : {},
      createdBy: input.actorUserId
    })))
  }

  throw new ContactSafetyError(evaluation)
}
