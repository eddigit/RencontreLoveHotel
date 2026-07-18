import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/moderation-investigation'
import { cn } from '@/lib/utils'

export function ModerationAvatar({ name, src, className }: {
  name?: string | null; src?: string | null; className?: string
}) {
  return (
    <Avatar className={cn('h-12 w-12 border border-white/15 bg-[#3b1749]', className)}>
      {src ? <AvatarImage src={src} alt={`Avatar de ${name || 'membre'}`} className='object-cover' /> : null}
      <AvatarFallback className='bg-[#3b1749] font-black text-[#ffb2d9]'>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}
