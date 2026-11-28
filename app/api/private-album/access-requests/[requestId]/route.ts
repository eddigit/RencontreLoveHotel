import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import { withTransaction } from '@/lib/db'
import {
  ensurePrivateAlbumSchema,
  isEligibleAlbumMember,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID
} from '@/lib/private-album'
import { createNotificationInternal } from '@/lib/notification-service'
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const owner = await requireCurrentUser()
    const { requestId } = await params
    const { decision } = await request.json()
    if (
      !PRIVATE_ALBUM_PHOTO_ID.test(requestId) ||
      !['grant', 'decline'].includes(decision)
    )
      return NextResponse.json(
        { error: 'Décision invalide.' },
        { status: 400, headers: privateNoStoreHeaders() }
      )
    await ensurePrivateAlbumSchema()
    if (!(await isEligibleAlbumMember(owner.id)))
      return NextResponse.json(
        { error: 'Compte non éligible.' },
        { status: 403, headers: privateNoStoreHeaders() }
      )
    const rows = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE private_album_access_requests r SET status=$3,updated_at=CURRENT_TIMESTAMP,decided_at=CURRENT_TIMESTAMP FROM users requester JOIN user_profiles rp ON rp.user_id=requester.id WHERE r.id=$1 AND r.owner_id=$2 AND r.status='pending' AND requester.id=r.requester_id AND COALESCE(requester.is_banned,false)=false AND COALESCE(requester.status,'active')='active' AND rp.display_profile IS TRUE AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=r.owner_id AND b.blocked_id=r.requester_id) OR (b.blocker_id=r.requester_id AND b.blocked_id=r.owner_id)) RETURNING r.*`,
        [requestId, owner.id, decision === 'grant' ? 'granted' : 'declined']
      )
      if (!updated.rows[0] || decision === 'decline') return updated.rows
      const grant = await client.query(
        `INSERT INTO private_album_grants(owner_id,viewer_id,request_id,expires_at) VALUES($1,$2,$3,CURRENT_TIMESTAMP + INTERVAL '1 hour') ON CONFLICT(owner_id,viewer_id) DO UPDATE SET request_id=EXCLUDED.request_id,granted_at=CURRENT_TIMESTAMP,expires_at=CURRENT_TIMESTAMP + INTERVAL '1 hour',revoked_at=NULL RETURNING id,expires_at`,
        [owner.id, updated.rows[0].requester_id, requestId]
      )
      return [
        {
          ...updated.rows[0],
          grant_id: grant.rows[0].id,
          expires_at: grant.rows[0].expires_at
        }
      ]
    })
    if (!rows[0])
      return NextResponse.json(
        { error: 'Demande inaccessible.' },
        { status: 404, headers: privateNoStoreHeaders() }
      )
    const r: any = rows[0]
    if (decision === 'grant')
      try {
        await createNotificationInternal({
          userId: r.requester_id,
          type: 'private_album_granted',
          title: 'Accès accordé',
          description:
            'Votre accès à un album privé a été accordé pour une heure.',
          link: `/profile/${owner.id}#album-prive`
        })
      } catch {}
    return NextResponse.json(
      {
        request: {
          id: r.id,
          status: r.status,
          ownerId: r.owner_id,
          requesterId: r.requester_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          grantId: r.grant_id || null,
          expiresAt: r.expires_at || null
        }
      },
      { headers: privateNoStoreHeaders() }
    )
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'Authentification requise'
            ? 'Connexion requise.'
            : 'Décision impossible.'
      },
      {
        status:
          e instanceof Error && e.message === 'Authentification requise'
            ? 401
            : 500,
        headers: privateNoStoreHeaders()
      }
    )
  }
}
