import { redirect } from 'next/navigation'

export default function LegacyReservationConfirmationPage() {
  redirect('/love-rooms?tab=reserve')
}
