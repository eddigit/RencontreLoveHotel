'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Loader2, LockKeyhole, ShieldAlert, Video } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type PrivatePhoto = {
  id: string
  width?: number | null
  height?: number | null
  createdAt: string
  url?: string
  contentUrl?: string
  audience?: 'members' | 'private'
  mediaType?: 'image/webp' | 'video/mp4' | 'video/webm'
}
type AlbumPayload = {
  photos?: PrivatePhoto[]
  grantExpiresAt?: string | null
  hasPrivateMedia?: boolean
  requestPending?: boolean
}

function until(expiry: string | null) {
  if (!expiry) return null
  const milliseconds = new Date(expiry).getTime() - Date.now()
  if (milliseconds <= 0) return 'expiré'
  const minutes = Math.ceil(milliseconds / 60000)
  return minutes < 60 ? `${minutes} min` : `${Math.ceil(minutes / 60)} h`
}

export function MemberPrivateAlbum({ ownerId }: { ownerId: string }) {
  const [photos, setPhotos] = useState<PrivatePhoto[]>([])
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [requestState, setRequestState] = useState<
    'idle' | 'pending' | 'granted'
  >('idle')
  const [hasPrivateMedia, setHasPrivateMedia] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const response = await fetch(
          `/api/private-album/members/${encodeURIComponent(ownerId)}/photos`,
          { cache: 'no-store' }
        )
        const payload: AlbumPayload & { error?: string } = await response
          .json()
          .catch(() => ({}))
        if (!response.ok) {
          setMessage(payload.error || 'Album indisponible pour le moment.')
          setPhotos([])
          return
        }
        setPhotos(Array.isArray(payload.photos) ? payload.photos : [])
        setExpiresAt(payload.grantExpiresAt || null)
        setHasPrivateMedia(payload.hasPrivateMedia === true)
        setRequestState(
          payload.grantExpiresAt &&
            new Date(payload.grantExpiresAt).getTime() > Date.now()
            ? 'granted'
            : payload.requestPending
              ? 'pending'
              : 'idle'
        )
      } catch {
        setMessage('Album indisponible pour le moment.')
        setPhotos([])
      } finally {
        setLoading(false)
      }
    },
    [ownerId]
  )

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const onFocus = () => {
      void load()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])
  useEffect(() => {
    if (!expiresAt) return
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 20000)
    const delay = new Date(expiresAt).getTime() - Date.now()
    if (delay <= 0) {
      window.clearInterval(poll)
      setExpiresAt(null)
      setSelected(null)
      void load()
      return
    }
    const timer = window.setTimeout(() => {
      setExpiresAt(null)
      setSelected(null)
      setMessage('Votre accès privé vient d’expirer.')
      void load()
    }, delay + 30)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(poll)
    }
  }, [expiresAt, load])

  async function askAccess() {
    setRequesting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/private-album/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId })
      })
      const payload = await response.json().catch(() => null)
      if (response.status === 409) {
        setRequestState('pending')
        setMessage('Votre demande est déjà en attente.')
        return
      }
      if (!response.ok)
        throw new Error(
          payload?.error || 'La demande ne peut pas être envoyée.'
        )
      setRequestState(
        payload?.request?.status === 'granted' ? 'granted' : 'pending'
      )
      setMessage(
        'Demande envoyée. Le membre peut accorder un accès d’une heure.'
      )
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'La demande ne peut pas être envoyée.'
      )
    } finally {
      setRequesting(false)
    }
  }

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === selected),
    [photos, selected]
  )
  const privateVisible = Boolean(
    expiresAt && new Date(expiresAt).getTime() > Date.now()
  )
  const showRequest =
    hasPrivateMedia || requestState === 'pending' || privateVisible
  return (
    <section
      id="album-prive"
      className="rounded-2xl border border-[#d6bc87]/25 bg-[#111821] p-5 text-[#ecebe7]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-black">
            <LockKeyhole className="h-4 w-4 text-[#d6bc87]" />
            Album protégé
          </h3>
          <p className="mt-1 text-sm text-[#c9c7c2]">
            Les clichés « membres » sont visibles ici. Les clichés privés
            nécessitent l’accord du membre.
          </p>
        </div>
        {privateVisible && (
          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
            Accès privé : {until(expiresAt)}
          </span>
        )}
      </div>
      <p className="mt-3 rounded-xl border border-amber-300/20 bg-graphite p-3 text-xs leading-5 text-amber-100">
        <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
        Captures d’écran et enregistrements interdits. Le navigateur peut
        freiner certains gestes, mais ne peut pas empêcher ni détecter
        fiablement une capture système ou externe.
      </p>
      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-[#e8e1d6]"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#c9c7c2]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’album…
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
            {photos.map((photo, index) => {
              const contentUrl =
                photo.contentUrl ||
                photo.url ||
                `/api/private-album/photos/${encodeURIComponent(photo.id)}/content`
              const isVideo = photo.mediaType?.startsWith('video/')
              return (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setSelected(photo.id)}
                  className="relative aspect-square overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-amber-200"
                  aria-label={`Agrandir le média ${index + 1}`}
                >
                  {isVideo ? (
                    <video
                      src={contentUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                      data-member-photo
                    />
                  ) : (
                    <img
                      src={contentUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full select-none object-cover"
                      draggable={false}
                      data-member-photo
                    />
                  )}
                  {isVideo && (
                    <Video className="absolute bottom-1 left-1 h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              )
            })}
          </div>
          {!photos.length && (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-[#aaa69e]">
              Aucun média accessible pour le moment.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {showRequest && (
              <button
                type="button"
                disabled={requesting || requestState === 'pending'}
                onClick={() => void askAccess()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d6bc87]/50 px-4 text-sm font-bold text-[#ead6aa] hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {requestState === 'pending'
                  ? 'Demande envoyée'
                  : privateVisible
                    ? 'Accès privé actif'
                    : 'Demander l’accès privé'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 text-sm font-semibold text-[#d6bc87] hover:underline"
            >
              Actualiser
            </button>
          </div>
        </>
      )}
      <Dialog
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <>
          {selectedPhoto && (
            <DialogContent
              aria-describedby={undefined}
              className="w-[94vw] max-w-3xl border-white/10 bg-[#131416] text-stone-100"
            >
              <DialogTitle>Média protégé</DialogTitle>
              <p className="text-xs text-amber-100">
                Captures et enregistrements interdits.
              </p>
              {selectedPhoto.mediaType?.startsWith('video/') ? (
                <video
                  src={
                    selectedPhoto.contentUrl ||
                    selectedPhoto.url ||
                    `/api/private-album/photos/${encodeURIComponent(selectedPhoto.id)}/content`
                  }
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  className="mx-auto max-h-[68svh] max-w-full"
                  data-member-photo
                />
              ) : (
                <img
                  src={
                    selectedPhoto.contentUrl ||
                    selectedPhoto.url ||
                    `/api/private-album/photos/${encodeURIComponent(selectedPhoto.id)}/content`
                  }
                  alt="Photo protégée"
                  className="mx-auto max-h-[68svh] max-w-full select-none object-contain"
                  draggable={false}
                  data-member-photo
                />
              )}
            </DialogContent>
          )}
        </>
      </Dialog>
    </section>
  )
}
