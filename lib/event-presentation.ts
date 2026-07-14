export const EVENT_TIME_ZONE = 'Europe/Paris'

export const DEFAULT_EVENT_IMAGES = {
  jacuzzi: '/images/events/apero-jacuzzi-rencontre.jpg',
  open_curtains: '/images/events/rideaux-ouverts-rencontre.jpg',
  default: '/images/events/love-hotel-evenement.png'
} as const

export const EMPTY_EVENTS_STATE = {
  title: 'Aucun événement programmé pour le moment',
  description:
    'Les prochaines dates seront affichées ici dès leur ouverture. Vous pouvez proposer une expérience ou demander à être prévenu.',
  cta: 'Proposer un événement'
} as const

export type EventPresentationInput = {
  image?: string | null
  category?: string | null
  experience_type?: string | null
  event_date?: string | Date | null
  event_time?: string | null
}

function getExperienceKey(event: EventPresentationInput) {
  return event.experience_type || event.category || 'default'
}

export function getDefaultEventImage(event: EventPresentationInput) {
  const key = getExperienceKey(event)
  if (key === 'jacuzzi') return DEFAULT_EVENT_IMAGES.jacuzzi
  if (key === 'open_curtains') return DEFAULT_EVENT_IMAGES.open_curtains
  return DEFAULT_EVENT_IMAGES.default
}

export function getEventImage(event: EventPresentationInput) {
  const image = typeof event.image === 'string' ? event.image.trim() : ''
  return image || getDefaultEventImage(event)
}

function getDatePart(value?: string | Date | null) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function getTimePart(value?: string | null) {
  if (!value) return '23:59:59'
  const match = String(value).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return '23:59:59'
  return `${match[1]}:${match[2]}:${match[3] || '00'}`
}

export function getEventDateTimeValue(event: EventPresentationInput) {
  const datePart = getDatePart(event.event_date)
  if (!datePart) return Number.POSITIVE_INFINITY

  const value = new Date(`${datePart}T${getTimePart(event.event_time)}`).getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

export function sortEventsChronologically<T extends EventPresentationInput>(
  events: T[]
) {
  return [...events].sort(
    (left, right) => getEventDateTimeValue(left) - getEventDateTimeValue(right)
  )
}

export function isPastEvent(event: EventPresentationInput, now = new Date()) {
  return getEventDateTimeValue(event) < now.getTime()
}

export function formatEventDateTime(event: EventPresentationInput) {
  const datePart = getDatePart(event.event_date)
  if (!datePart) return ''

  const [year, month, day] = datePart.split('-').map(Number)
  const timePart = getTimePart(event.event_time)
  const [hour, minute] = timePart.split(':').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(date)

  const formattedTime = minute > 0 ? `${hour}h${String(minute).padStart(2, '0')}` : `${hour}h`
  return `${formattedDate}, ${formattedTime}`
}
