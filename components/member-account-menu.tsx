'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronUp, LogOut, Mail, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type AccountUser = {
  name?: string | null
  email?: string | null
  avatar?: string | null
  role?: string | null
}

export function MemberAccountMenu ({
  user: suppliedUser,
  variant = 'desktop'
}: {
  user?: AccountUser | null
  variant?: 'desktop' | 'mobile'
}) {
  const { user: authenticatedUser, logout } = useAuth()
  const user = suppliedUser ?? authenticatedUser
  const isMobile = variant === 'mobile'

  if (!user) return null

  const displayName = user.name?.trim() || 'Mon compte'
  const initial = displayName.charAt(0).toUpperCase()

  function handleLogout () {
    logout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isMobile ? (
          <button
            type='button'
            className='relative flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-2 text-purple-200/70 transition hover:text-white data-[state=open]:text-[#ff3b8b]'
            aria-label='Ouvrir le menu du compte'
          >
            <AccountAvatar user={user} initial={initial} size='small' />
            <span className='mt-1 text-xs'>Compte</span>
          </button>
        ) : (
          <button
            type='button'
            className='flex w-full items-center gap-3 rounded-lg border border-white/12 bg-white/[0.055] p-2.5 text-left transition hover:border-[#ff8cc8]/45 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8cc8]'
            aria-label='Ouvrir le menu du compte'
          >
            <AccountAvatar user={user} initial={initial} size='large' />
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-bold text-white'>
                {displayName}
              </span>
              <span className='block text-xs text-white/58'>Mon compte</span>
            </span>
            <ChevronUp className='h-4 w-4 shrink-0 text-white/55' />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side='top'
        align={isMobile ? 'end' : 'start'}
        sideOffset={isMobile ? 12 : 8}
        className={cn(
          'border-white/12 bg-[#21082f] p-1.5 text-white shadow-2xl shadow-black/45',
          isMobile ? 'w-56' : 'w-[188px]'
        )}
      >
        <DropdownMenuLabel className='px-2 py-2'>
          <span className='block truncate text-sm'>{displayName}</span>
          {user.email && (
            <span className='mt-0.5 block truncate text-xs font-normal text-white/55'>
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='bg-white/10' />
        <DropdownMenuItem asChild className='cursor-pointer focus:bg-white/10 focus:text-white'>
          <Link href='/profile'>
            <UserRound />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className='cursor-pointer focus:bg-white/10 focus:text-white'>
          <Link href='/email-preferences'>
            <Mail />
            Préférences e-mail
          </Link>
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem asChild className='cursor-pointer focus:bg-white/10 focus:text-white'>
            <Link href='/admin'>
              <Settings />
              Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className='bg-white/10' />
        <DropdownMenuItem
          onSelect={handleLogout}
          className='cursor-pointer text-[#ff8cc8] focus:bg-[#ff3b8b]/15 focus:text-[#ffb2d8]'
        >
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountAvatar ({
  user,
  initial,
  size
}: {
  user: AccountUser
  initial: string
  size: 'small' | 'large'
}) {
  const dimension = size === 'small' ? 24 : 38

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff3b8b] to-[#7c3aed] font-bold text-white ring-1 ring-white/20',
        size === 'small' ? 'h-6 w-6 text-[10px]' : 'h-[38px] w-[38px] text-sm'
      )}
    >
      {user.avatar ? (
        <Image
          src={user.avatar}
          alt={`Photo de ${user.name || 'profil'}`}
          width={dimension}
          height={dimension}
          className='h-full w-full object-cover'
        />
      ) : (
        initial
      )}
    </span>
  )
}
