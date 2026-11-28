const parisDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' })
const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })

export function CircleAgendaWeek({ events }: { events: { id: string; event_date: string | Date }[] }) {
  const today = parisDate.format(new Date())
  const start = new Date(today + 'T12:00:00Z')
  return <ol aria-label='Les sept prochains jours' className='my-4 grid grid-cols-7 gap-1 text-center'>
    {Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start)
      day.setUTCDate(day.getUTCDate() + index)
      const iso = day.toISOString().slice(0, 10)
      const scheduled = events.some(event => (event.event_date instanceof Date ? parisDate.format(event.event_date) : event.event_date.slice(0, 10)) === iso)
      return <li key={iso} aria-current={index === 0 ? 'date' : undefined}
        aria-label={fullDate.format(day) + (scheduled ? ', rendez-vous prévu' : '')}
        className={'rounded-md py-1.5 ' + (index === 0 ? 'bg-[#d6bc87] text-[#191714]' : 'bg-[#191b20] text-[#f1eee8]')}>
        <span className='block text-[10px] uppercase'>{weekday.format(day).replace('.', '')}</span>
        <span className={'text-sm font-bold ' + (scheduled ? 'underline underline-offset-2' : '')}>{day.getUTCDate()}</span>
      </li>
    })}
  </ol>
}
