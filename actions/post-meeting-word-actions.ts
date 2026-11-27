'use server'
import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { enforceMemberContent } from '@/lib/content-safety-service'
import { ensurePostMeetingWordsSchema } from '@/lib/post-meeting-words'
import { createAppNotificationInternal as notify } from '@/lib/notification-service'
import {
  reportMember,
  type MemberReportReason,
} from '@/actions/member-safety-actions'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export type PostMeetingWordStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
export type PostMeetingWord = {
  id: string
  authorId: string
  recipientId: string
  authorPseudonym: string
  recipientPseudonym: string
  message: string
  status: PostMeetingWordStatus
  submittedAt: string
  recipientDecisionAt: string | null
  withdrawnAt: string | null
}
type Row = {
  id: string
  author_id: string
  recipient_id: string
  author_pseudonym_snapshot: string
  recipient_pseudonym_snapshot: string
  message: string
  status: PostMeetingWordStatus
  created_at: string
  recipient_decision_at: string | null
  withdrawn_at: string | null
}
const map = (r: Row): PostMeetingWord => ({
  id: r.id,
  authorId: r.author_id,
  recipientId: r.recipient_id,
  authorPseudonym: r.author_pseudonym_snapshot,
  recipientPseudonym: r.recipient_pseudonym_snapshot,
  message: r.message,
  status: r.status,
  submittedAt: r.created_at,
  recipientDecisionAt: r.recipient_decision_at,
  withdrawnAt: r.withdrawn_at,
})
const ready = () => ensurePostMeetingWordsSchema()

export async function submitPostMeetingWord(input: {
  recipientUserId: string
  message: string
  confirmMeeting: boolean
  acceptPublication: boolean
}) {
  const author = await requireCurrentUser(),
    message = input.message?.trim().replace(/\s+/g, ' ')
  if (
    !UUID.test(input.recipientUserId) ||
    input.recipientUserId === author.id ||
    input.confirmMeeting !== true ||
    input.acceptPublication !== true ||
    !message ||
    message.length < 5 ||
    message.length > 1000
  )
    throw new Error('Mot après rencontre invalide')
  await enforceMemberContent({
    actorUserId: author.id,
    surface: 'message',
    content: message,
  })
  await ready()
  const rows = await sql.query<Row[]>(
    `INSERT INTO post_meeting_words (author_id,recipient_id,author_pseudonym_snapshot,recipient_pseudonym_snapshot,message) SELECT author.id,recipient.id,NULLIF(TRIM(author.name),''),NULLIF(TRIM(recipient.name),''),$3 FROM users author JOIN user_profiles ap ON ap.user_id=author.id JOIN users recipient ON recipient.id=$2 JOIN user_profiles rp ON rp.user_id=recipient.id WHERE author.id=$1 AND COALESCE(author.is_banned,false)=false AND COALESCE(author.status,'active')='active' AND ap.display_profile=TRUE AND COALESCE(recipient.is_banned,false)=false AND COALESCE(recipient.status,'active')='active' AND rp.display_profile=TRUE AND NULLIF(TRIM(author.name),'') IS NOT NULL AND NULLIF(TRIM(recipient.name),'') IS NOT NULL AND (SELECT COUNT(*) FROM post_meeting_words recent WHERE recent.author_id=author.id AND recent.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') < 3 AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=author.id AND b.blocked_id=recipient.id) OR (b.blocker_id=recipient.id AND b.blocked_id=author.id)) ON CONFLICT (author_id,recipient_id) DO NOTHING RETURNING id,author_id,recipient_id,author_pseudonym_snapshot,recipient_pseudonym_snapshot,message,status,created_at,recipient_decision_at,withdrawn_at`,
    [author.id, input.recipientUserId, message],
  )
  if (!rows[0])
    throw new Error(
      'Envoi impossible : cette relation ne permet pas un nouveau mot',
    )
  const word = map(rows[0])
  await notify({
    userId: word.recipientId,
    type: 'post_meeting_word',
    title: 'Un mot après rencontre attend votre accord',
    description:
      'Confirmez la rencontre et choisissez si ce mot peut être affiché.',
    link: '/profile?tab=profile#post-meeting-words',
    priority: 'normal',
    category: 'community',
    audience: 'user',
    metadata: { wordId: word.id },
    createdBy: author.id,
  }).catch(() => undefined)
  return word
}

export async function respondToPostMeetingWord(
  id: string,
  input: { confirmMeeting: boolean; acceptPublication: boolean },
) {
  const recipient = await requireCurrentUser()
  if (!UUID.test(id)) throw new Error('Mot après rencontre invalide')
  await ready()
  const accepted =
    input.confirmMeeting === true && input.acceptPublication === true
  const rows = await sql.query<Row[]>(
    `UPDATE post_meeting_words w SET status=$3,recipient_confirmed_at=CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END,recipient_publication_consent_at=CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END,recipient_decision_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP FROM users author JOIN user_profiles ap ON ap.user_id=author.id JOIN users recipient_account ON recipient_account.id=$2 JOIN user_profiles rp ON rp.user_id=recipient_account.id WHERE w.id=$1 AND w.recipient_id=$2 AND w.status='pending' AND w.author_confirmed_at IS NOT NULL AND w.author_publication_consent_at IS NOT NULL AND author.id=w.author_id AND COALESCE(author.is_banned,false)=false AND COALESCE(author.status,'active')='active' AND ap.display_profile=TRUE AND COALESCE(recipient_account.is_banned,false)=false AND COALESCE(recipient_account.status,'active')='active' AND rp.display_profile=TRUE AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=w.author_id AND b.blocked_id=w.recipient_id) OR (b.blocker_id=w.recipient_id AND b.blocked_id=w.author_id)) RETURNING w.id,w.author_id,w.recipient_id,w.author_pseudonym_snapshot,w.recipient_pseudonym_snapshot,w.message,w.status,w.created_at,w.recipient_decision_at,w.withdrawn_at`,
    [
      id,
      recipient.id,
      accepted ? 'accepted' : 'declined',
      input.confirmMeeting === true,
      input.acceptPublication === true,
    ],
  )
  if (!rows[0]) throw new Error('Mot indisponible ou déjà traité')
  return map(rows[0])
}
export async function withdrawPostMeetingWord(id: string) {
  const user = await requireCurrentUser()
  if (!UUID.test(id)) throw new Error('Mot après rencontre invalide')
  await ready()
  const rows = await sql.query<Row[]>(
    `UPDATE post_meeting_words SET status='withdrawn',withdrawn_at=CURRENT_TIMESTAMP,withdrawn_by=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND (author_id=$2 OR recipient_id=$2) AND status IN ('pending','accepted') RETURNING id,author_id,recipient_id,author_pseudonym_snapshot,recipient_pseudonym_snapshot,message,status,created_at,recipient_decision_at,withdrawn_at`,
    [id, user.id],
  )
  return rows[0] ? map(rows[0]) : null
}
export async function getOwnPostMeetingWords() {
  const user = await requireCurrentUser()
  await ready()
  return (
    await sql.query<Row[]>(
      `SELECT id,author_id,recipient_id,author_pseudonym_snapshot,recipient_pseudonym_snapshot,message,status,created_at,recipient_decision_at,withdrawn_at FROM post_meeting_words WHERE author_id=$1 ORDER BY created_at DESC`,
      [user.id],
    )
  ).map(map)
}
export async function getReceivedPostMeetingWords() {
  const user = await requireCurrentUser()
  await ready()
  return (
    await sql.query<Row[]>(
      `SELECT id,author_id,recipient_id,author_pseudonym_snapshot,recipient_pseudonym_snapshot,message,status,created_at,recipient_decision_at,withdrawn_at FROM post_meeting_words WHERE recipient_id=$1 ORDER BY created_at DESC`,
      [user.id],
    )
  ).map(map)
}
export async function getPublicPostMeetingWords(profileUserId: string) {
  const viewer = await requireCurrentUser()
  if (!UUID.test(profileUserId)) return []
  await ready()
  return (
    await sql.query<Row[]>(
      `SELECT w.id,w.author_id,w.recipient_id,w.author_pseudonym_snapshot,w.recipient_pseudonym_snapshot,w.message,w.status,w.created_at,w.recipient_decision_at,w.withdrawn_at FROM post_meeting_words w JOIN users author ON author.id=w.author_id JOIN user_profiles ap ON ap.user_id=author.id JOIN users recipient ON recipient.id=w.recipient_id JOIN user_profiles rp ON rp.user_id=recipient.id WHERE w.recipient_id=$1 AND w.status='accepted' AND COALESCE(author.is_banned,false)=false AND COALESCE(author.status,'active')='active' AND ap.display_profile=TRUE AND COALESCE(recipient.is_banned,false)=false AND COALESCE(recipient.status,'active')='active' AND rp.display_profile=TRUE AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=author.id AND b.blocked_id=recipient.id) OR (b.blocker_id=recipient.id AND b.blocked_id=author.id) OR (b.blocker_id=$2 AND b.blocked_id IN (author.id,recipient.id)) OR (b.blocked_id=$2 AND b.blocker_id IN (author.id,recipient.id))) ORDER BY w.created_at DESC`,
      [profileUserId, viewer.id],
    )
  ).map(map)
}
export async function reportPostMeetingWord(
  id: string,
  input: { reason: MemberReportReason; details?: string },
) {
  const user = await requireCurrentUser()
  if (!UUID.test(id)) throw new Error('Mot invalide')
  await ready()
  const rows = await sql.query<Array<{ author_id: string }>>(
    `SELECT w.author_id FROM post_meeting_words w JOIN users author ON author.id=w.author_id JOIN user_profiles ap ON ap.user_id=author.id JOIN users recipient ON recipient.id=w.recipient_id JOIN user_profiles rp ON rp.user_id=recipient.id WHERE w.id=$1 AND (w.recipient_id=$2 OR (w.status='accepted' AND COALESCE(author.is_banned,false)=false AND COALESCE(author.status,'active')='active' AND ap.display_profile=TRUE AND COALESCE(recipient.is_banned,false)=false AND COALESCE(recipient.status,'active')='active' AND rp.display_profile=TRUE AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=$2 AND b.blocked_id IN (w.author_id,w.recipient_id)) OR (b.blocked_id=$2 AND b.blocker_id IN (w.author_id,w.recipient_id)))))`,
    [id, user.id],
  )
  if (!rows[0]) throw new Error('Signalement indisponible')
  return reportMember({
    targetUserId: rows[0].author_id,
    reason: input.reason,
    details: [input.details?.trim(), `Référence mot après rencontre: ${id}`]
      .filter(Boolean)
      .join('\n'),
  })
}
