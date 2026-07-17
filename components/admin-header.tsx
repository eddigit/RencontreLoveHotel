"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandLogo } from '@/components/brand-logo'
import { ExternalLink } from 'lucide-react'

export function AdminHeader({ user }: { user?: any }) {
  return (
    <div className='mb-6 mt-2 flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/20 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex min-w-0 items-center gap-4'>
        <Link href='/admin' className='w-14 shrink-0 rounded-2xl border border-white/10 bg-black/45 p-1.5 sm:w-16'>
          <BrandLogo compact={false} priority />
        </Link>
        <div className='min-w-0'>
          <p className='text-xs font-black uppercase tracking-[0.2em] text-[#ff8cc8]'>Love Hotel Rencontre</p>
          <h1 className='mt-1 text-2xl font-black tracking-tight sm:text-3xl'>Administration</h1>
          <p className='mt-1 truncate text-sm text-white/58'>
            Bienvenue{user?.name ? `, ${user.name}` : ''}. Pilotage, activité et sécurité de la communauté.
          </p>
        </div>
      </div>
      <Button asChild variant='outline' className='shrink-0 border-white/15 bg-white/[0.04]'>
        <Link href='/discover'>Retour au site <ExternalLink className='ml-2 h-4 w-4' /></Link>
      </Button>
    </div>
  )
}
