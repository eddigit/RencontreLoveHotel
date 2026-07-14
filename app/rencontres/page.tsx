"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Star, Users, Calendar, Gift, Coffee, Wine, Key, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function RencontresPage() {
  return (
    <div className="min-h-screen bg-[#120821]">

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/couple-love-room-red-curtain.png"
            alt="Love Hotel Ambiance"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#120821] via-[#120821]/70 to-[#120821]"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">L'EXPÉRIENCE LOVE HÔTEL</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Un Écosystème Complet pour des <span className="text-[#ff3b8b]">Rencontres Authentiques</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Découvrez un univers où le virtuel se transforme en expériences réelles inoubliables, dans des lieux
              d'exception dédiés à la rencontre et au plaisir partagé.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-8 py-6 text-lg">
                <Link href="/register">Devenir membre</Link>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12">
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">26</div>
              <div className="text-gray-300">Love Rooms</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">40K+</div>
              <div className="text-gray-300">Membres</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">12</div>
              <div className="text-gray-300">Événements/mois</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">4★</div>
              <div className="text-gray-300">Hôtel de luxe</div>
            </div>
          </div>
        </div>
      </section>

      {/* Love Rooms Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">LOVE ROOMS</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                26 Love Rooms Thématiques pour Vivre vos Fantasmes
              </h2>
              <p className="text-gray-300 mb-6">
                Nos Love Rooms sont conçues pour offrir des expériences uniques, chacune avec sa propre ambiance et
                thématique. Du romantique au plus audacieux, découvrez des espaces où vos désirs prennent vie dans un
                cadre luxueux et discret.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Key className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Accès privatif et sécurisé
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Sparkles className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Décors thématiques immersifs
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                    <Wine className="h-3 w-3 text-[#ff3b8b]" />
                  </div>
                  Service de champagne et collations
                </li>
              </ul>
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-6 py-2">
                <Link href="/love-rooms">Découvrir nos Love Rooms</Link>
              </Button>
            </div>
            <div className="md:w-1/2 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden aspect-[3/4] relative">
                  <Image src="/purple-jacuzzi-retreat.png" alt="Love Room Jacuzzi" fill className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-bold">Suite Jacuzzi</h3>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden aspect-[3/4] relative">
                  <Image src="/twilight-tryst.png" alt="Love Room Romantique" fill className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-bold">Suite Romantique</h3>
                  </div>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="rounded-xl overflow-hidden aspect-[3/4] relative">
                  <Image src="/opulent-rendezvous.png" alt="Love Room Luxe" fill className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-bold">Suite Luxe</h3>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden aspect-[3/4] relative">
                  <Image src="/pink-jacuzzi-night.png" alt="Love Room Festive" fill className="object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-bold">Suite Festive</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hotel & Restaurant Section */}
      <section className="py-20 bg-[#1a0d2e]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">HÉBERGEMENT & GASTRONOMIE</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Un Hôtel 4 Étoiles et un Restaurant Gastronomique
            </h2>
            <p className="text-gray-300">
              Prolongez votre expérience avec un séjour dans notre hôtel de luxe et savourez une cuisine raffinée dans
              notre restaurant gastronomique. Des escapades de plusieurs jours aux dîners romantiques, nous vous offrons
              un cadre d'exception.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 overflow-hidden">
              <div className="relative h-64">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/images/luxury-hotel-suite-purple-glow-Ij9Iy9Yd9Yd9Yd9Yd9Yd9.png"
                  alt="Hôtel 4 étoiles"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1155] to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <div className="flex">
                    {[1, 2, 3, 4].map((star) => (
                      <Star key={star} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-3">Hôtel de Luxe</h3>
                <p className="text-gray-300 mb-4">
                  Notre hôtel 4 étoiles vous accueille dans un cadre somptueux pour des escapades romantiques de
                  plusieurs jours. Chambres luxueuses, service attentionné et accès privilégié à toutes nos
                  installations.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Star className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Chambres et suites de luxe
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Coffee className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Service en chambre 24h/24
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Key className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Accès direct aux Love Rooms
                  </li>
                </ul>
                <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                  <Link href="/hotel">Découvrir l'hôtel</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 overflow-hidden">
              <div className="relative h-64">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/images/romantic-restaurant-purple-lighting-Ij9Iy9Yd9Yd9Yd9Yd9Yd9.png"
                  alt="Restaurant gastronomique"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1155] to-transparent"></div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-3">Restaurant Gastronomique</h3>
                <p className="text-gray-300 mb-4">
                  Notre restaurant vous propose une expérience culinaire exceptionnelle dans un cadre intime et élégant.
                  Savourez des plats raffinés préparés par notre chef étoilé, accompagnés des meilleurs vins.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Star className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Cuisine gastronomique
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Wine className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Carte des vins exceptionnelle
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Heart className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Espaces privatifs pour couples
                  </li>
                </ul>
                <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                  <Link href="/restaurant">Découvrir le restaurant</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">ÉVÉNEMENTS EXCLUSIFS</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Des Événements Uniques Réservés à Nos Membres
              </h2>
              <p className="text-gray-300 mb-6">
                Participez à nos événements exclusifs conçus pour favoriser les rencontres authentiques dans des cadres
                exceptionnels. Du speed dating raffiné aux soirées à thème, en passant par nos after avec brunch et
                champagne, chaque événement est une occasion de créer des connexions réelles.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl">
                  <Calendar className="h-8 w-8 text-[#ff3b8b] mb-2" />
                  <h3 className="text-white font-bold mb-1">Speed Dating Premium</h3>
                  <p className="text-sm text-gray-300">Rencontres rapides dans un cadre élégant</p>
                </div>
                <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl">
                  <Sparkles className="h-8 w-8 text-[#ff3b8b] mb-2" />
                  <h3 className="text-white font-bold mb-1">Soirées Thématiques</h3>
                  <p className="text-sm text-gray-300">Des ambiances variées pour tous les goûts</p>
                </div>
                <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl">
                  <Coffee className="h-8 w-8 text-[#ff3b8b] mb-2" />
                  <h3 className="text-white font-bold mb-1">Brunch & Champagne</h3>
                  <p className="text-sm text-gray-300">Afterparty exclusives et conviviales</p>
                </div>
                <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl">
                  <Users className="h-8 w-8 text-[#ff3b8b] mb-2" />
                  <h3 className="text-white font-bold mb-1">Clubs Privés</h3>
                  <p className="text-sm text-gray-300">Accès à nos partenaires exclusifs</p>
                </div>
              </div>
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-6 py-2">
                <Link href="/events">Voir nos événements</Link>
              </Button>
            </div>
            <div className="md:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden">
                  <Image
                    src="/purple-speed-dates.png"
                    alt="Speed Dating"
                    width={300}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden">
                  <Image
                    src="/pink-dance-vibe.png"
                    alt="Soirée Dansante"
                    width={300}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden">
                  <Image
                    src="/purple-haze-brunch.png"
                    alt="Brunch Premium"
                    width={300}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden">
                  <Image
                    src="/speed-dating-restaurant-chic.png"
                    alt="Restaurant Chic"
                    width={300}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium & Partners Section */}
      <section className="py-20 bg-[#1a0d2e]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">PREMIUM & PARTENAIRES</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Avantages Premium et Partenariats Exclusifs
            </h2>
            <p className="text-gray-300">
              Nos membres premium bénéficient d'avantages exclusifs et d'un accès privilégié à notre réseau de
              partenaires. Découvrez notre conciergerie privée et notre partenariat avec LOOLYYB, la première
              cryptomonnaie dédiée au plaisir.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Conciergerie Privée</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Notre service de conciergerie privée est à la disposition de nos membres premium pour organiser des
                  soirées sur mesure, réserver des expériences exclusives et répondre à toutes vos demandes spécifiques.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Star className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Organisation d'événements privés
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Key className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Accès VIP à nos partenaires
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Users className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Service personnalisé 24h/24
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center">
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
                      className="h-6 w-6 text-[#ff3b8b]"
                    >
                      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Partenariat LOOLYYB</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Découvrez LOOLYYB, la première cryptomonnaie dédiée au plaisir et aux amoureux. Nos membres
                  bénéficient d'avantages exclusifs et peuvent gagner des tokens LOOLYYB en participant à nos événements
                  et en utilisant nos services.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Star className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Récompenses en tokens LOOLYYB
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Key className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Paiements sécurisés et anonymes
                  </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-6 w-6 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mr-3">
                      <Gift className="h-3 w-3 text-[#ff3b8b]" />
                    </div>
                    Avantages exclusifs pour les détenteurs
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-6">Nos Partenaires Premium</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-[#2d1155]/30 backdrop-blur-sm p-6 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-[#ff3b8b]/10 flex items-center justify-center mb-3">
                    <Wine className="h-8 w-8 text-[#ff3b8b]" />
                  </div>
                  <h4 className="text-white font-bold">Bars Exclusifs</h4>
                </div>
              </div>
              <div className="bg-[#2d1155]/30 backdrop-blur-sm p-6 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-[#ff3b8b]/10 flex items-center justify-center mb-3">
                    <Users className="h-8 w-8 text-[#ff3b8b]" />
                  </div>
                  <h4 className="text-white font-bold">Clubs Privés</h4>
                </div>
              </div>
              <div className="bg-[#2d1155]/30 backdrop-blur-sm p-6 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-[#ff3b8b]/10 flex items-center justify-center mb-3">
                    <Calendar className="h-8 w-8 text-[#ff3b8b]" />
                  </div>
                  <h4 className="text-white font-bold">Théâtres d'Intimité</h4>
                </div>
              </div>
              <div className="bg-[#2d1155]/30 backdrop-blur-sm p-6 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-[#ff3b8b]/10 flex items-center justify-center mb-3">
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
                      className="h-8 w-8 text-[#ff3b8b]"
                    >
                      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                    </svg>
                  </div>
                  <h4 className="text-white font-bold">LOOLYYB</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-[#4a2282] to-[#ff3b8b] rounded-3xl p-12 flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-2/3 mb-8 lg:mb-0">
              <h2 className="text-4xl font-bold mb-4 text-white">Prêt à Vivre l'Expérience Love Hôtel ?</h2>
              <p className="text-xl text-white/90">
                Rejoignez notre communauté de 40 000 membres et découvrez un monde où les rencontres virtuelles se
                transforment en expériences réelles inoubliables.
              </p>
            </div>
            <div>
              <Button
                asChild
                size="lg"
                className="bg-white text-[#ff3b8b] hover:bg-white/90 rounded-full text-lg px-8 py-6"
              >
                <Link href="/register">Devenir Membre</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
