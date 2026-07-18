import { AlertTriangle, Paperclip } from 'lucide-react'
import { ModerationAvatar } from '@/components/moderation/moderation-avatar'

export type ThreadMessage = {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string | null
  content: string
  createdAt: Date | string
  flagged?: boolean
  attachments?: Array<{ id: string; url: string; fileName?: string | null; mediaType?: string }>
}

export function ConversationThread({ messages, subjectUserId }: {
  messages: ThreadMessage[]; subjectUserId?: string | null
}) {
  if (!messages.length) return <p className='rounded-2xl border border-white/10 p-5 text-sm text-white/55'>Aucun message dans cette conversation.</p>
  return (
    <div className='max-h-[720px] space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4' aria-label='Fil chronologique de la conversation'>
      {messages.map(message => {
        const isSubject = subjectUserId ? message.senderId === subjectUserId : false
        return (
          <div key={message.id} className={`flex gap-3 ${isSubject ? '' : 'flex-row-reverse'}`}>
            <ModerationAvatar name={message.senderName} src={message.senderAvatar} className='h-9 w-9' />
            <div className={`max-w-[82%] rounded-2xl border p-3 ${message.flagged ? 'border-red-400/60 bg-red-500/10' : isSubject ? 'border-white/10 bg-white/[0.06]' : 'border-[#ff77b7]/25 bg-[#8c285f]/25'}`}>
              <div className='flex flex-wrap items-center gap-2 text-xs text-white/55'>
                <strong className='text-white/85'>{message.senderName}</strong>
                <time>{new Date(message.createdAt).toLocaleString('fr-FR')}</time>
                {message.flagged && <span className='inline-flex items-center gap-1 font-bold text-red-200'><AlertTriangle className='h-3.5 w-3.5' /> Source d’alerte</span>}
              </div>
              <p className='mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white'>{message.content}</p>
              {(message.attachments || []).map(attachment => (
                <a key={attachment.id} href={attachment.url} target='_blank' rel='noreferrer' className='mt-2 flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 text-xs text-[#ffb2d9] underline'>
                  <Paperclip className='h-3.5 w-3.5' /> {attachment.fileName || attachment.mediaType || 'Pièce jointe'}
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
