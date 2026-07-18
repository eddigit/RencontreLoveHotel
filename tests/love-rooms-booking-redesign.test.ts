import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('Love Rooms booking-first experience', () => {
  const page = readFileSync('app/love-rooms/page.tsx', 'utf8')
  const widget = readFileSync('components/love-hotel-booking.tsx', 'utf8')

  it('puts the official booking engine before secondary experiences', () => {
    expect(page).toContain('Réserver une Love Room')
    expect(page).toContain('Réservation officielle Love Hotel')
    expect(page).toContain('<LoveHotelBookingWidget />')
    expect(page.indexOf('<LoveHotelBookingWidget />')).toBeLessThan(page.indexOf('Prolonger l’expérience'))
    expect(page).not.toContain("<Tabs")
    expect(page).not.toContain('Offres en standby')
  })

  it('keeps only useful visual bridges and direct assistance', () => {
    expect(page).toContain('/couple-love-room-red-curtain.png')
    expect(page).toContain('/jacuzzi-champagne.avif')
    expect(page).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(page).toContain("href: '/events/new'")
    expect(page).toContain("href: '/conciergerie'")
    expect(page).toContain("href='tel:+33144826305'")
  })

  it('loads the official widget once and adapts its height', () => {
    expect(widget).toContain('srcDoc={bookingDocument}')
    expect(widget).toContain('https://booking.lovehotel.io/assets/index.css')
    expect(widget).toContain('https://booking.lovehotel.io/assets/index.js')
    expect(widget).toContain('ResizeObserver')
    expect(widget).toContain('window.parent.postMessage')
    expect(widget).toContain("event.data?.type !== 'lovehotel-booking-height'")
    expect(widget).toContain('event.source !== iframeRef.current?.contentWindow')
    expect(widget).toContain('allow-forms')
    expect(widget).toContain('allow-top-navigation-by-user-activation')
    expect(widget).not.toContain('appendChild(script)')
    expect(widget).not.toContain('getElementById("lovehotel-iframe")')
  })
})
