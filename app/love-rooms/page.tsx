'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MainLayout from '@/components/layout/main-layout'
import Link from 'next/link'

// Ajouter l'import du widget de réservation en haut du fichier
import { LoveHotelBookingWidget } from '@/components/love-hotel-booking'
import ConciergerieForm from '@/components/ConciergerieForm'

export default function LoveRoomsPage () {
  const [activeTab, setActiveTab] = useState('offers')

  return (
    <MainLayout>
      <div className='min-h-screen flex flex-col pb-16 md:pb-0'>
        <div className='container py-4 md:py-6 flex-1'>
          <div className='mb-4 md:mb-8'>
            <h1 className='text-2xl md:text-3xl font-bold mb-2'>
              Escapades Love Hôtel
            </h1>
            <p className='text-muted-foreground text-sm md:text-base'>
              Réservez une Love Room pour un moment inoubliable, ou transformez Pigalle et Châtelet en lieux de rencontre communautaire.
            </p>
          </div>

          <section className='mb-6 overflow-hidden rounded-2xl border border-[#ff8cc8]/20 bg-[linear-gradient(135deg,rgba(255,59,139,0.18),rgba(61,17,85,0.86),rgba(10,3,18,0.96))]'>
            <div className='grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]'>
              <div className='p-5 md:p-6'>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                  Sources de rencontres
                </p>
                <h2 className='mt-2 text-2xl font-black md:text-4xl'>
                  La chambre devient le déclencheur de rencontre.
                </h2>
                <p className='mt-3 max-w-3xl text-sm leading-6 text-white/68'>
                  Les chambres à l’heure, le Jacuzzi privatif et les Chambres rideaux ouverts permettent de choisir son rythme : rester en privé, observer l’ambiance, ou ouvrir davantage quand tout le monde est aligné.
                </p>
                <div className='mt-4 inline-flex rounded-full border border-[#ff8cc8]/30 bg-[#ff3b8b]/16 px-4 py-2 text-sm font-black text-[#ffb4d8]'>
                  À partir de 35 €/h
                </div>
                <div className='mt-5 grid gap-3 md:grid-cols-3'>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='font-black'>Rideaux fermés</div>
                    <div className='mt-1 text-xs text-white/54'>Une Love Room privée pour découvrir sans pression.</div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='font-black'>Rideaux entrouverts</div>
                    <div className='mt-1 text-xs text-white/54'>Une initiation douce, contrôlée, réversible.</div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='font-black'>Rideaux ouverts</div>
                    <div className='mt-1 text-xs text-white/54'>Une expérience assumée entre profils déjà consentants.</div>
                  </div>
                </div>
              </div>
              <div className='border-t border-white/10 bg-black/18 p-5 lg:border-l lg:border-t-0'>
                <div className='grid gap-3'>
                  <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                    <Link href='/events/new'>Créer un apéro jacuzzi</Link>
                  </Button>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/events/new'>Organiser des rideaux ouverts</Link>
                  </Button>
                  <Button onClick={() => setActiveTab('reserve')} variant='outline' className='border-white/12 bg-white/[0.04]'>
                    Réserver maintenant
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-center mb-6">
            <div className="flex flex-col md:flex-row items-center gap-2 px-6 py-4 rounded-xl bg-pink-600/90 shadow-lg">
              <span className="text-white text-lg md:text-xl font-semibold">
                Pour toute aide à la réservation ou informations complémentaires :
              </span>
              <a
                href="tel:+33144826305"
                className="text-white text-xl md:text-2xl font-bold underline ml-2"
                style={{ letterSpacing: '1px' }}
              >
                +33 1 44 82 63 05
              </a>
            </div>
          </div>

          {/* Sélecteur mobile pour les onglets */}
          <div className="mb-4 md:hidden flex justify-center">
            <select
              className="w-full max-w-xs mx-auto rounded-lg border border-purple-300 bg-white/90 p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
              value={activeTab}
              onChange={e => setActiveTab(e.target.value)}
            >
              <option value="offers">Offres en standby</option>
              <option value="my-reservations">Conciergerie coquine</option>
              <option value="reserve">Réserver une Love-Room</option>
            </select>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            {/* Onglets classiques desktop */}
            <TabsList className='hidden md:flex w-full mb-4 md:mb-6 justify-between gap-2'>
              <TabsTrigger value='offers' className='text-xs sm:text-sm w-full'>
                Offres en standby
              </TabsTrigger>
              <TabsTrigger value='my-reservations' className='text-xs sm:text-sm w-full'>
                Conciergerie coquine
              </TabsTrigger>
              <TabsTrigger value='reserve' className='text-xs sm:text-sm w-full'>
                Réserver une Love-Room
              </TabsTrigger>
            </TabsList>

            {/* Remplacer le contenu de l'onglet "reserve" par le widget de réservation */}
            <TabsContent value='reserve'>
              <div className='p-4 md:p-6 bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm rounded-lg shadow-lg shadow-purple-900/20 border border-purple-800/20'>
                <h3 className='text-xl font-bold mb-4'>
                  Réserver une Love Room
                </h3>
                <p className='text-muted-foreground mb-6'>
                  Utilisez notre système de réservation en ligne pour réserver
                  votre Love Room préférée. Sélectionnez la date, l'heure et la
                  durée de votre séjour.
                </p>
                <div className='bg-[#1a0d2e]/50 rounded-lg shadow-lg overflow-hidden'>
                  <LoveHotelBookingWidget />
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value='my-reservations'
              className='space-y-4 md:space-y-6'
            >
              <ConciergerieForm />
            </TabsContent>
            <TabsContent value='offers'>
              <div className='p-4 md:p-6'>
                <div className='mb-5 rounded-2xl border border-[#ff8cc8]/25 bg-[#ff3b8b]/12 p-5'>
                  <p className='text-xs font-black uppercase tracking-[0.18em] text-[#ff9bd0]'>
                    Offres en standby
                  </p>
                  <h3 className='mt-2 text-2xl font-black'>
                    Restaurant et bar indisponibles.
                  </h3>
                  <p className='mt-2 max-w-3xl text-sm leading-6 text-white/64'>
                    Les anciennes offres petit déjeuner, déjeuner, apéro bar et dîner romantique sont suspendues. La communauté doit maintenant se concentrer sur les expériences réellement disponibles dans les établissements.
                  </p>
                </div>
                <div className='grid gap-4 lg:grid-cols-2'>
                  <article className='rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,59,139,0.16),rgba(45,17,85,0.92))] p-5'>
                    <div className='inline-flex rounded-full bg-[#ff3b8b]/20 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ff9bd0]'>
                      2 ou 3 chambres
                    </div>
                    <h4 className='mt-4 text-2xl font-black'>Rideaux ouverts</h4>
                    <p className='mt-2 text-sm leading-6 text-white/62'>
                      Une rencontre progressive dans deux ou trois chambres différentes : rideaux fermés, entrouverts ou ouverts selon le niveau de confort de chaque couple.
                    </p>
                    <Button asChild className='mt-5 bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                      <Link href='/events/new'>Créer des rideaux ouverts</Link>
                    </Button>
                  </article>
                  <article className='rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(148,255,201,0.12),rgba(45,17,85,0.92))] p-5'>
                    <div className='inline-flex rounded-full bg-[#94ffc9]/14 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#94ffc9]'>
                      2, 3 ou 4 couples maximum
                    </div>
                    <h4 className='mt-4 text-2xl font-black'>Apéro jacuzzi</h4>
                    <p className='mt-2 text-sm leading-6 text-white/62'>
                      Un petit comité autour du jacuzzi, pensé pour créer une vraie opportunité de rencontre sans relancer d’offre bar ou restaurant.
                    </p>
                    <Button asChild className='mt-5 bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                      <Link href='/events/new'>Créer un apéro jacuzzi</Link>
                    </Button>
                  </article>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </MainLayout>
  )
}
