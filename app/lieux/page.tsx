import type { Metadata } from 'next'
import VenueGuide from './venue-guide'

export const metadata: Metadata = {
  title: 'Lieux de rencontre et Love Rooms à Paris · Joug',
  description: 'Les adresses du Love Hôtel et les prochaines sélections de restaurants, clubs, espaces BDSM et spectacles pour adultes.',
  alternates: { canonical: '/lieux' }
}

export default async function LieuxPage({ searchParams }: {
  searchParams: Promise<{ categorie?: string | string[] }>
}) {
  const { categorie } = await searchParams
  return <VenueGuide requestedCategory={typeof categorie === 'string' ? categorie : undefined} />
}
