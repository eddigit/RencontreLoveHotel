"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Video, Users, Eye, Shield, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function EnDirectPage() {
  return (
    <div className="min-h-screen bg-[#120821]">

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/purple-haze-chat.png" alt="Live Chat Background" fill className="object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#120821] via-[#120821]/70 to-[#120821]"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">EXPÉRIENCE EN DIRECT</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Connectez-vous en <span className="text-[#ff3b8b]">Temps Réel</span> avec notre Communauté
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Découvrez nos fonctionnalités en direct qui vous permettent d'interagir instantanément avec d'autres
              membres, de participer à des événements live et de créer des connexions authentiques.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-8 py-6 text-lg">
                <Link href="/register">Rejoindre maintenant</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="text-white border-white hover:bg-white/10 rounded-full px-8 py-6 text-lg"
              >
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 overflow-hidden">
              <div className="relative h-48">
                <Image src="/pink-glow-chat.png" alt="Chat en direct" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1155] to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white">En ligne</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="h-6 w-6 text-[#ff3b8b]" />
                  <h3 className="text-xl font-bold text-white">Chat en Direct</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Échangez instantanément avec d'autres membres via notre système de messagerie en temps réel. Discutez,
                  partagez des photos et planifiez vos rencontres.
                </p>
                <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                  <Link href="/messages">Découvrir</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 overflow-hidden">
              <div className="relative h-48">
                <Image src="/purple-haze-chat.png" alt="Vidéo chat" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1155] to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white">En ligne</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Video className="h-6 w-6 text-[#ff3b8b]" />
                  <h3 className="text-xl font-bold text-white">Vidéo Chat</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Passez à la vitesse supérieure avec nos appels vidéo sécurisés. Faites connaissance face à face avant
                  de vous rencontrer dans l'un de nos établissements.
                </p>
                <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                  <Link href="/video-chat">Découvrir</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 overflow-hidden">
              <div className="relative h-48">
                <Image src="/purple-speed-dates.png" alt="Événements live" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1155] to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white">En direct</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-[#ff3b8b]" />
                  <h3 className="text-xl font-bold text-white">Événements Live</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Participez à nos événements diffusés en direct. Speed dating virtuel, soirées thématiques et
                  discussions de groupe pour multiplier vos chances de rencontres.
                </p>
                <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                  <Link href="/events">Découvrir</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Rooms Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">LOVE ROOMS EN DIRECT</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Expérience "Rideaux Ouverts" : L'Intimité Partagée
              </h2>
              <p className="text-gray-300 mb-6">
                Découvrez notre concept unique "Rideaux Ouverts" qui vous permet de partager des moments intimes en
                toute sécurité. Assistez à des performances live dans nos Love Rooms spécialement aménagées ou devenez
                vous-même acteur de votre propre expérience.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Eye className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Spectacles live exclusifs
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Shield className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Environnement sécurisé et discret
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Heart className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Expériences sur mesure
                </li>
              </ul>
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-6 py-2">
                <Link href="/live-rooms">Découvrir les Live Rooms</Link>
              </Button>
            </div>
            <div className="md:w-1/2">
              <div className="relative rounded-xl overflow-hidden">
                <Image
                  src="/couple-love-room-red-curtain.png"
                  alt="Expérience Rideaux Ouverts"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-red-500 text-white flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                    LIVE
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-xl">Suite Passion</h3>
                      <p className="text-white/80 text-sm">Expérience Rideaux Ouverts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-white/80">
                        <Eye className="h-4 w-4" />
                        <span>238</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/80">
                        <Clock className="h-4 w-4" />
                        <span>45:12</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Features Section */}
      <section className="py-20 bg-[#1a0d2e]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">FONCTIONNALITÉS EN DIRECT</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Des Outils Innovants pour des Connexions Instantanées
            </h2>
            <p className="text-gray-300">
              Notre plateforme propose des fonctionnalités avancées pour faciliter vos interactions en temps réel et
              rendre chaque échange plus authentique et immersif.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="m9 15 3 3 3-3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Partage de Médias</h3>
              <p className="text-gray-300">
                Partagez instantanément photos et vidéos privées avec vos contacts. Nos filtres et effets exclusifs vous
                permettent de sublimer chaque moment partagé.
              </p>
            </div>

            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M13 8H7" />
                  <path d="M17 12H7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Traduction en Temps Réel</h3>
              <p className="text-gray-300">
                Communiquez sans barrière linguistique grâce à notre système de traduction instantanée. Échangez avec
                des membres du monde entier en toute fluidité.
              </p>
            </div>

            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Vérification en Direct</h3>
              <p className="text-gray-300">
                Notre système de vérification en temps réel garantit l'authenticité des profils. Interagissez en toute
                confiance avec des membres certifiés.
              </p>
            </div>

            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Statut de Disponibilité</h3>
              <p className="text-gray-300">
                Indiquez votre disponibilité en temps réel pour des rencontres spontanées. Soyez alerté lorsque vos
                contacts favoris sont disponibles pour une rencontre.
              </p>
            </div>

            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M2 12V2h10" />
                  <path d="M2 7h5" />
                  <path d="M12 22V12h10" />
                  <path d="M17 12v5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Jeux Interactifs</h3>
              <p className="text-gray-300">
                Brisez la glace avec nos jeux interactifs conçus pour stimuler les échanges. Découvrez vos
                compatibilités et partagez des moments ludiques.
              </p>
            </div>

            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-6 rounded-xl">
              <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ff3b8b]"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                  <path d="M8.5 8.5v.01" />
                  <path d="M16 15.5v.01" />
                  <path d="M12 12v.01" />
                  <path d="M11 17v.01" />
                  <path d="M7 14v.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Réservation Instantanée</h3>
              <p className="text-gray-300">
                Réservez en un clic nos Love Rooms et services directement depuis votre conversation. Passez du virtuel
                au réel en quelques secondes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-[#4a2282] to-[#ff3b8b] rounded-3xl p-12 flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-2/3 mb-8 lg:mb-0">
              <h2 className="text-4xl font-bold mb-4 text-white">Prêt à Vivre l'Expérience en Direct ?</h2>
              <p className="text-xl text-white/90">
                Rejoignez notre communauté et découvrez toutes nos fonctionnalités en temps réel. Des rencontres
                authentiques vous attendent !
              </p>
            </div>
            <div>
              <Button
                asChild
                size="lg"
                className="bg-white text-[#ff3b8b] hover:bg-white/90 rounded-full text-lg px-8 py-6"
              >
                <Link href="/register">Commencer Maintenant</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
