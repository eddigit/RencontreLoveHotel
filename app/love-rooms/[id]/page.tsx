import { redirect } from 'next/navigation'

export default function LegacyLoveRoomPage() {
  redirect('/love-rooms?tab=reserve')
}
