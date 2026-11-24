export default function Loading() {
  return (
    <main className='min-h-screen bg-[#170321] px-4 py-6 text-white sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-[1680px] animate-pulse'>
        <div className='mb-6 h-8 w-48 rounded bg-white/10' />
        <div className='grid min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] lg:grid-cols-[380px_minmax(0,1fr)]'>
          <section className='border-r border-white/10 p-4'>
            <div className='h-12 rounded-2xl bg-white/[0.07]' />
            <div className='mt-5 space-y-3'>
              {[0, 1, 2, 3].map(item => (
                <div key={item} className='flex items-center gap-3 rounded-2xl bg-white/[0.045] p-3'>
                  <div className='h-12 w-12 rounded-full bg-white/10' />
                  <div className='flex-1 space-y-2'><div className='h-3 w-2/5 rounded bg-white/10' /><div className='h-3 w-4/5 rounded bg-white/[0.07]' /></div>
                </div>
              ))}
            </div>
          </section>
          <section className='hidden p-6 lg:block'>
            <div className='mt-24 h-16 w-3/5 rounded-3xl bg-white/[0.07]' />
            <div className='ml-auto mt-4 h-20 w-2/5 rounded-3xl bg-[#ff3b8b]/20' />
          </section>
        </div>
      </div>
    </main>
  )
}
