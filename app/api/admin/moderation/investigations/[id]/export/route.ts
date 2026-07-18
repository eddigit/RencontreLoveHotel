import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
const html = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin()
  const { id } = await context.params

  const [investigation] = await sql.query<any[]>(
    `SELECT mi.*, u.id AS user_id, u.name, u.email, u.avatar, u.role, u.status AS account_status,
            u.is_banned, u.messaging_restricted_until,
            (SELECT TO_JSONB(up) - 'id' - 'user_id' FROM user_profiles up WHERE up.user_id = u.id LIMIT 1) AS profile
     FROM moderation_investigations mi JOIN users u ON u.id = mi.subject_user_id WHERE mi.id = $1`,
    [id]
  )
  if (!investigation) return Response.json({ error: 'Dossier introuvable' }, { status: 404 })

  const [alerts, messages, officialMessages, decisions, accessLog, events, attachments] = await Promise.all([
    sql.query<any[]>(`SELECT * FROM moderation_queue WHERE investigation_id = $1 ORDER BY created_at ASC`, [id]),
    sql.query<any[]>(
      `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name, m.content, m.is_read, m.created_at, m.updated_at
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id IN (
         SELECT cp.conversation_id FROM conversation_participants cp WHERE cp.user_id = $1
       ) ORDER BY m.conversation_id, m.created_at ASC`,
      [investigation.subject_user_id]
    ),
    sql.query<any[]>(`SELECT * FROM moderation_official_messages WHERE investigation_id = $1 ORDER BY created_at ASC`, [id]),
    sql.query<any[]>(
      `SELECT md.* FROM moderation_decisions md JOIN moderation_queue mq ON mq.id = md.case_id
       WHERE mq.investigation_id = $1 ORDER BY md.created_at ASC`, [id]
    ),
    sql.query<any[]>(
      `SELECT actor_id, actor_role, purpose, resource_type, resource_id, accessed_at
       FROM moderation_case_access WHERE investigation_id = $1 ORDER BY accessed_at ASC`, [id]
    ),
    sql.query<any[]>(`SELECT * FROM moderation_investigation_events WHERE investigation_id = $1 ORDER BY created_at ASC`, [id]),
    sql.query<any[]>(
      `SELECT ma.*, m.conversation_id FROM message_attachments ma JOIN messages m ON m.id = ma.message_id
       WHERE m.conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = $1)
       ORDER BY m.created_at, ma.sort_order`, [investigation.subject_user_id]
    )
  ])

  const generatedAt = new Date().toISOString()
  const profileJson = JSON.stringify({ generatedAt, investigation, profile: investigation.profile }, null, 2)
  const messagesCsv = [
    ['conversation_id', 'message_id', 'sender_id', 'sender_name', 'created_at', 'content'].map(csvCell).join(','),
    ...messages.map(row => [row.conversation_id, row.id, row.sender_id, row.sender_name, row.created_at, row.content].map(csvCell).join(','))
  ].join('\n')
  const auditCsv = [
    ['actor_id', 'actor_role', 'purpose', 'resource_type', 'resource_id', 'accessed_at'].map(csvCell).join(','),
    ...accessLog.map(row => [row.actor_id, row.actor_role, row.purpose, row.resource_type, row.resource_id, row.accessed_at].map(csvCell).join(','))
  ].join('\n')
  const reportHtml = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Dossier LHR ${html(id)}</title>
  <style>body{font:15px/1.55 system-ui;max-width:1100px;margin:40px auto;padding:0 24px;color:#19121d}h1,h2{color:#631343}.card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0}.meta{color:#665b68}.message{border-left:4px solid #b62d78;padding:8px 14px;margin:10px 0;white-space:pre-wrap}.alert{border-left-color:#c62828}</style>
  <h1>Dossier probatoire de modération LHR</h1><p class="meta">Dossier ${html(id)} — généré ${html(generatedAt)} — empreintes dans manifest.json.</p>
  <div class="card"><h2>Profil figé</h2><p><strong>${html(investigation.name)}</strong> — ${html(investigation.email)}</p><p>Compte : ${html(investigation.account_status)} · banni : ${html(investigation.is_banned)}</p></div>
  <h2>Alertes (${alerts.length})</h2>${alerts.map(row => `<div class="card alert"><strong>${html(row.severity)} — ${html(row.reason)}</strong><p>${html(row.excerpt)}</p><small>${html(row.created_at)}</small></div>`).join('')}
  <h2>Conversations (${messages.length} messages)</h2>${messages.map(row => `<div class="message"><strong>${html(row.sender_name)}</strong> · ${html(row.created_at)}<br>${html(row.content)}</div>`).join('')}
  <h2>Canal officiel (${officialMessages.length})</h2>${officialMessages.map(row => `<div class="message">${html(row.created_at)}<br>${html(row.content)}<br><small>Lu : ${html(row.read_at || 'non')}</small></div>`).join('')}
  <h2>Pièces jointes référencées (${attachments.length})</h2><p>Les URL, métadonnées, tailles et types sont conservés dans attachments.json afin de préserver la source sans téléchargement automatique.</p>
  <h2>Traçabilité</h2><p>${decisions.length} décision(s), ${events.length} événement(s), ${accessLog.length} consultation(s) journalisée(s).</p></html>`

  const files: Record<string, string> = {
    'rapport.html': reportHtml,
    'profil.json': profileJson,
    'alertes.json': JSON.stringify(alerts, null, 2),
    'messages.csv': messagesCsv,
    'pieces-jointes.json': JSON.stringify(attachments, null, 2),
    'canal-officiel.json': JSON.stringify(officialMessages, null, 2),
    'decisions.json': JSON.stringify(decisions, null, 2),
    'evenements.json': JSON.stringify(events, null, 2),
    'audit.csv': auditCsv
  }
  const manifest = {
    version: 1, algorithm: 'SHA-256', generatedAt, investigationId: id,
    generatedBy: actor.id,
    automaticTransmission: false,
    files: Object.entries(files).map(([name, content]) => ({ name, bytes: Buffer.byteLength(content), sha256: sha256(content) }))
  }
  const manifestJson = JSON.stringify(manifest, null, 2)
  const manifestSha256 = sha256(manifestJson)

  const zip = new JSZip()
  Object.entries(files).forEach(([name, content]) => zip.file(name, content))
  zip.file('manifest.json', manifestJson)
  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

  const [exportRow] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO moderation_exports (investigation_id, created_by, purpose, sha256, manifest)
     VALUES ($1, $2, 'authority_or_lawyer_review', $3, $4::jsonb) RETURNING id`,
    [id, actor.id, manifestSha256, manifestJson]
  )
  await sql.query(
    `INSERT INTO moderation_investigation_events (investigation_id, actor_id, event_type, details)
     VALUES ($1, $2, 'evidence_exported', $3::jsonb)`,
    [id, actor.id, JSON.stringify({ exportId: exportRow.id, manifestSha256 })]
  )

  return new Response(new Uint8Array(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="lhr-moderation-${id}-${generatedAt.slice(0, 10)}.zip"`,
      'Cache-Control': 'no-store',
      'X-Evidence-SHA256': manifestSha256
    }
  })
}
