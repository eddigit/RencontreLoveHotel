export default function Loading() {
  return (
    <main className='container py-10' aria-busy='true' aria-live='polite'>
      <div className='rounded-3xl border border-white/10 bg-[#15171b] p-6 shadow-2xl shadow-black/15'>
        <p className='text-sm text-muted-foreground'>Chargement de l’administration…</p>
      </div>
    </main>
  )
}
