import { AuthPageShell } from '@/components/auth-page-shell'

export default function Loading() {
  return (
    <AuthPageShell>
      <div
        aria-busy='true'
        aria-live='polite'
        className='rounded-2xl border border-white/10 bg-[#130d18]/92 p-6 shadow-2xl shadow-black/35'
      >
        <p className='text-center text-sm text-muted-foreground'>Chargement de la connexion…</p>
      </div>
    </AuthPageShell>
  )
}
