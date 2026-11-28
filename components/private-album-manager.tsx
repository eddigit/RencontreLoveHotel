'use client'

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  ShieldAlert,
  Trash2,
  Users,
  Video
} from 'lucide-react'

type Audience = 'members' | 'private'
type AlbumPhoto = {
  id: string
  width?: number | null
  height?: number | null
  createdAt: string
  audience: Audience
  mediaType?: 'image/webp' | 'video/mp4' | 'video/webm'
  contentUrl?: string
}
type AlbumRequest = {
  id: string
  status: 'pending' | 'granted' | 'declined' | 'revoked' | 'expired' | string
  createdAt?: string
  expiresAt?: string | null
  grantId?: string | null
  requester?: { id?: string; name?: string | null }
  owner?: { id?: string; name?: string | null }
  requesterId?: string
  ownerId?: string
  requesterName?: string | null
  ownerName?: string | null
}

const audienceCopy: Record<
  Audience,
  { label: string; help: string; icon: typeof Users }
> = {
  members: {
    label: 'Visible aux membres',
    help: 'Visible par les membres qui peuvent consulter votre profil.',
    icon: Users
  },
  private: {
    label: 'Privé sur demande',
    help: 'Visible uniquement après votre accord, pendant une heure.',
    icon: EyeOff
  }
}

function errorMessage(response: Response, payload: any, fallback: string) {
  return (
    payload?.error ||
    payload?.message ||
    (response.status === 413 ? 'Le fichier est trop volumineux.' : fallback)
  )
}

function displayName(
  request: AlbumRequest,
  direction: 'incoming' | 'outgoing'
) {
  const person = direction === 'incoming' ? request.requester : request.owner
  return (
    person?.name ||
    (direction === 'incoming' ? request.requesterName : request.ownerName) ||
    'Membre'
  )
}

export function PrivateAlbumManager() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [requests, setRequests] = useState<{
    incoming: AlbumRequest[]
    outgoing: AlbumRequest[]
  }>({ incoming: [], outgoing: [] })
  const [audience, setAudience] = useState<Audience>('private')
  const [publishToFeed, setPublishToFeed] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [photosResponse, requestsResponse] = await Promise.all([
        fetch('/api/private-album/photos', { cache: 'no-store' }),
        fetch('/api/private-album/access-requests', { cache: 'no-store' })
      ])
      const photosData = await photosResponse.json().catch(() => null)
      const requestsData = await requestsResponse.json().catch(() => null)
      if (!photosResponse.ok)
        throw new Error(
          errorMessage(
            photosResponse,
            photosData,
            'Impossible de charger vos albums.'
          )
        )
      setPhotos(Array.isArray(photosData?.photos) ? photosData.photos : [])
      if (requestsResponse.ok)
        setRequests({
          incoming: requestsData?.incoming || [],
          outgoing: requestsData?.outgoing || []
        })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Impossible de charger vos albums.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setSelectedFile(file)
    setError(null)
    setNotice(null)
  }

  async function upload() {
    const file = selectedFile
    if (!file) return
    setUploading(true)
    setError(null)
    setNotice(null)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('audience', audience)
      body.set(
        'publishToFeed',
        audience === 'members' && publishToFeed ? 'true' : 'false'
      )
      const response = await fetch('/api/private-album/photos', {
        method: 'POST',
        body
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(
          errorMessage(response, payload, "L'envoi de la photo a échoué.")
        )
      if (payload?.photo) setPhotos((current) => [...current, payload.photo])
      setNotice(
        audience === 'members'
          ? (publishToFeed ? 'Média ajouté à la galerie membres et publié sur le mur.' : 'Média ajouté à la galerie membres.')
          : 'Média ajouté à votre album privé.'
      )
      setSelectedFile(null)
      setAudience('private')
      setPublishToFeed(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "L'envoi de la photo a échoué."
      )
    } finally {
      setUploading(false)
    }
  }

  async function deletePhoto(photoId: string) {
    setBusyId(photoId)
    setError(null)
    try {
      const response = await fetch(
        `/api/private-album/photos/${encodeURIComponent(photoId)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(
          errorMessage(
            response,
            payload,
            'La photo ne peut pas être supprimée.'
          )
        )
      }
      setPhotos((current) => current.filter((photo) => photo.id !== photoId))
      setNotice('Photo supprimée.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'La photo ne peut pas être supprimée.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function decide(requestId: string, decision: 'grant' | 'decline') {
    setBusyId(requestId)
    setError(null)
    try {
      const response = await fetch(
        `/api/private-album/access-requests/${encodeURIComponent(requestId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision })
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(
          errorMessage(
            response,
            payload,
            'La demande ne peut pas être mise à jour.'
          )
        )
      setRequests((current) => ({
        ...current,
        incoming: current.incoming.map((request) =>
          request.id === requestId
            ? { ...request, ...payload?.request }
            : request
        )
      }))
      setNotice(
        decision === 'grant'
          ? 'Accès accordé pour une heure.'
          : 'Demande refusée.'
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'La demande ne peut pas être mise à jour.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(request: AlbumRequest) {
    const grantId = request.grantId || request.id
    setBusyId(request.id)
    setError(null)
    try {
      const response = await fetch(
        `/api/private-album/grants/${encodeURIComponent(grantId)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(
          errorMessage(response, payload, 'L’accès ne peut pas être retiré.')
        )
      }
      setRequests((current) => ({
        ...current,
        incoming: current.incoming.map((item) =>
          item.id === request.id
            ? { ...item, status: 'revoked', expiresAt: null }
            : item
        )
      }))
      setNotice('Accès retiré immédiatement.')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'L’accès ne peut pas être retiré.'
      )
    } finally {
      setBusyId(null)
    }
  }

  const grouped = {
    members: photos.filter((photo) => photo.audience === 'members'),
    private: photos.filter((photo) => photo.audience === 'private')
  }

  return (
    <section
      aria-labelledby="private-album-title"
      className="mt-6 rounded-2xl border border-[#d6bc87]/25 bg-[#171818] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="private-album-title"
            className="flex items-center gap-2 text-lg font-black"
          >
            <ShieldAlert className="h-5 w-5 text-[#e3bf80]" />
            Mes photos et vidéos
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#c9c7c2]">
            Choisissez qui peut voir chaque photo ou vidéo avant de l’ajouter.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
        >
          Actualiser
        </button>
      </div>
      <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-200/[0.06] p-3 text-xs leading-5 text-amber-100">
        Les captures d’écran et l’enregistrement sont interdits. Les protections
        limitent certains gestes dans le navigateur, mais aucun site ne peut
        empêcher ni détecter de façon fiable une capture faite par le système ou
        un autre appareil.
      </p>
      {notice && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-100"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0a0f15] p-3">
        <p className="text-sm font-bold">Ajouter un média</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(['members', 'private'] as Audience[]).map((value) => {
            const Icon = audienceCopy[value].icon
            return (
              <button
                type="button"
                key={value}
                disabled={uploading}
                onClick={() => { setAudience(value); if (value === 'private') setPublishToFeed(false) }}
                aria-pressed={audience === value}
                className={`min-h-14 rounded-xl border p-3 text-left transition ${audience === value ? 'border-[#d6bc87] bg-[#d6bc87]/15 text-[#fff8e8]' : 'border-white/10 text-[#c9c7c2] hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-2 font-bold">
                  <Icon className="h-4 w-4" />
                  {audienceCopy[value].label}
                </span>
                <span className="mt-1 block text-xs opacity-80">
                  {audienceCopy[value].help}
                </span>
              </button>
            )
          })}
        </div>
        {audience === 'members' && (
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-[#e8e1d6]">
            <input
              type="checkbox"
              disabled={uploading}
              checked={publishToFeed}
              onChange={(event) => setPublishToFeed(event.target.checked)}
              className="size-4 accent-[#d6bc87]"
            />
            Publier aussi sur le mur d’accueil
          </label>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= 12}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d6bc87]/50 px-4 text-sm font-bold text-[#ead6aa] hover:bg-[#d6bc87]/10 disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          Choisir un média
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={selectFile}
          className="sr-only"
          disabled={uploading || photos.length >= 12}
        />
        {selectedFile && (
          <div className="mt-3 rounded-xl border border-[#d6bc87]/30 bg-[#d6bc87]/[0.06] p-3">
            <p
              className="truncate text-sm font-semibold"
              title={selectedFile.name}
            >
              Fichier sélectionné : {selectedFile.name}
            </p>
            <p className="mt-1 text-xs text-[#c9c7c2]">
              Vérifiez la visibilité ci-dessus avant confirmation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void upload()}
                disabled={uploading}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d6bc87] px-4 text-sm font-bold text-[#191714] hover:bg-[#e5d1aa] disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {publishToFeed && audience === 'members'
                  ? 'Ajouter et publier'
                  : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  setAudience('private')
                  setPublishToFeed(false)
                }}
                disabled={uploading}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#c9c7c2] hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-[#aaa69e]">
          {photos.length}/12 médias · Photos JPG, PNG ou WebP jusqu’à 4 Mo · Vidéos MP4 ou WebM jusqu’à 3 Mo.
        </p>
      </div>
      {loading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-[#c9c7c2]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des albums…
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {(['members', 'private'] as Audience[]).map((group) => (
            <div key={group}>
              <h4 className="flex items-center gap-2 font-bold">
                {group === 'members' ? (
                  <Users className="h-4 w-4 text-[#e3bf80]" />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#e3bf80]" />
                )}
                {audienceCopy[group].label}{' '}
                <span className="text-sm font-normal text-[#aaa69e]">
                  ({grouped[group].length})
                </span>
              </h4>
              <p className="mt-1 text-xs text-[#aaa69e]">
                {audienceCopy[group].help}
              </p>
              {grouped[group].length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {grouped[group].map((photo) => {
                    const contentUrl =
                      photo.contentUrl ||
                      `/api/private-album/photos/${encodeURIComponent(photo.id)}/content`
                    const isVideo = photo.mediaType?.startsWith('video/')
                    return (
                      <div
                        key={photo.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/20"
                      >
                        {isVideo ? (
                          <video
                            src={contentUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            data-member-photo
                          />
                        ) : (
                          <img
                            src={contentUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            data-member-photo
                            draggable={false}
                          />
                        )}{' '}
                        {isVideo && (
                          <Video className="absolute bottom-1 left-1 h-4 w-4 text-white drop-shadow" />
                        )}
                        <button
                          type="button"
                          onClick={() => void deletePhoto(photo.id)}
                          disabled={busyId === photo.id}
                          className="absolute right-1 top-1 grid size-9 place-items-center rounded-full bg-black/75 text-white hover:bg-red-800 disabled:opacity-60"
                          aria-label="Supprimer ce média"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-[#aaa69e]">
                  Aucun média dans cet album.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 border-t border-white/10 pt-5">
        <h4 className="font-bold">Demandes d’accès reçues</h4>
        {requests.incoming.length ? (
          <ul className="mt-3 space-y-2">
            {requests.incoming.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a0f15] p-3"
              >
                <div>
                  <p className="font-semibold">
                    {displayName(request, 'incoming')}
                  </p>
                  <p className="text-xs text-[#aaa69e]">
                    {request.status === 'granted' && request.expiresAt
                      ? `Accès jusqu’au ${new Date(request.expiresAt).toLocaleString('fr-FR')}`
                      : request.status === 'pending'
                        ? 'En attente de votre décision'
                        : (({ declined: 'Demande refusée', revoked: 'Accès retiré', expired: 'Accès expiré' } as Record<string,string>)[request.status] || 'Demande traitée')}
                  </p>
                </div>
                {request.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => void decide(request.id, 'grant')}
                      className="min-h-10 rounded-lg bg-[#d6bc87] px-3 text-sm font-bold text-[#191714] disabled:opacity-60"
                    >
                      Accorder 1 h
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => void decide(request.id, 'decline')}
                      className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-semibold disabled:opacity-60"
                    >
                      Refuser
                    </button>
                  </div>
                ) : request.status === 'granted' ? (
                  <button
                    type="button"
                    disabled={busyId === request.id}
                    onClick={() => void revoke(request)}
                    className="min-h-10 rounded-lg border border-red-300/40 px-3 text-sm font-semibold text-red-100 disabled:opacity-60"
                  >
                    Retirer l’accès
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#aaa69e]">Aucune demande reçue.</p>
        )}
      </div>
    </section>
  )
}
