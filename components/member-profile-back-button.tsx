'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MemberProfileBackButton() {
  const router = useRouter()

  return (
    <Button
      type='button'
      variant='outline'
      className='border-white/12 bg-white/[0.04]'
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
          return
        }
        router.push('/discover')
      }}
    >
      <ArrowLeft className='mr-2 h-4 w-4' />
      Retour
    </Button>
  )
}
