"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AdvertisementBannerBottom } from "@/components/advertisement-banner-bottom"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#120821] overflow-x-hidden">
      {/* Hero Section */}
      <section className="py-8 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0d2e] via-[#3d1155] to-[#1a0d2e] opacity-90"></div>
          <div className="absolute inset-0 bg-[url('/purple-glow-pattern.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container px-4 grid md:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">
          <div className="space-y-6 md:space-y-8 -mt-[15vh]">
            <div className="space-y-3 md:space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase text-white leading-tight tracking-tight">
                LE FRISSON DE <br />
                LA <span className="text-[#ff3b8b]">RENCONTRE</span>, <br />
                LE PLAISIR DU <br />
                <span className="text-[#ff3b8b]">RÉEL </span> <span className="text-4xl">🔥</span>
              </h1>

              <p className="text-gray-300 text-base md:text-lg max-w-xl">
                Entrez dans l'univers Love Hôtel : l'unique application qui relie rencontres virtuelles et plaisirs
                réels. Rejoignez une communauté authentique de 40 000 membres, et vivez des expériences exclusives dans
                nos Love Rooms, spas, bars et restaurants.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <Button
                asChild
                className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:opacity-90 text-white rounded-full px-6 py-5 text-base md:text-lg border-0"
              >
                <Link href="/rencontres">Pourquoi nous rejoindre ?</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="text-white border-white hover:bg-white/10 rounded-full px-6 py-5 text-base md:text-lg"
              >
                <Link href="/register">Devenir membre</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-purple-900/30">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/images/luxury-jacuzzi-group-f7nIeUbLIQISpGe5YmIcboYSMPeCeg.png"
                  alt="Espace Spa"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0d2e]/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-[#1a0d2e]/50 backdrop-blur-sm">
                  <p className="text-base md:text-lg font-bold text-white">JACUZZI PRIVATIF</p>
                  <p className="text-xs md:text-sm text-white/80">Expérience privative</p>
                </div>
              </div>

              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-purple-900/30">
                <Image
                  src="/speed-dating-restaurant-chic.png"
                  alt="Speed Dating Restaurant Chic"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0d2e]/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-[#1a0d2e]/50 backdrop-blur-sm">
                  <p className="text-base md:text-lg font-bold text-white">SPEED DATING</p>
                  <p className="text-xs md:text-sm text-white/80">Rencontres exclusives</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mt-6 md:mt-8">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-purple-900/30">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/amethyst-glow-YU11au0rIIGAWH8iymdMmtFrC6ZFIb.png"
                  alt="Sophia"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0d2e]/80 via-transparent to-transparent"></div>
                <div className="absolute top-2 right-2">
                  <span className="live-badge">LIVE</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-[#1a0d2e]/50 backdrop-blur-sm">
                  <p className="text-base md:text-lg font-bold text-white">SOPHIA</p>
                  <p className="text-xs md:text-sm text-white/80">En ligne maintenant</p>
                </div>
              </div>

              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-purple-900/30">
                <Image
                  src="https://lovehotelaparis.fr/wp-content/uploads/2025/04/image1.jpg"
                  alt="Expérience Rideaux Ouverts"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0d2e]/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-[#1a0d2e]/50 backdrop-blur-sm">
                  <p className="text-base md:text-lg font-bold text-white">RIDEAUX OUVERTS</p>
                  <p className="text-xs md:text-sm text-white/80">Expérience unique</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0d2e] to-[#3d1155]"></div>
          <div className="absolute inset-0 bg-[url('/purple-glow-pattern.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container px-4 relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold text-white text-center mb-8 md:mb-12">
            Pourquoi Choisir <span className="text-[#ff3b8b]">Love Hotel</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
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
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">Rencontrez, Vibrez, Vivez</h3>
              <p className="text-gray-300 text-sm md:text-base">
                Avec plus de 40 000 membres actifs, Love Hôtel vous connecte à une vraie communauté prête à se
                rencontrer dans des lieux exclusifs.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">Des Événements Uniques</h3>
              <p className="text-gray-300 text-sm md:text-base">
                Participez à nos soirées coquines, speed datings et expériences "Rideaux Ouverts" pour provoquer des
                connexions réelles.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
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
                  <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"></path>
                  <circle cx="17" cy="7" r="5"></circle>
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">Vos Fantasmes, Nos Love Rooms</h3>
              <p className="text-gray-300 text-sm md:text-base">
                Réservez directement depuis l'application nos Love Rooms thématiques, nos jacuzzis privatifs ou nos
                espaces détente.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-white">
                Le Virtuel qui se Vit dans le Réel
              </h3>
              <p className="text-gray-300 text-sm md:text-base">
                Fini les faux profils ! Sur Love Hôtel, les échanges se concrétisent dans la vraie vie, dans un cadre
                sûr et élégant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-8 md:py-16">
        <div className="container px-4">
          <div className="bg-gradient-to-r from-[#3d1155] to-[#ff3b8b] rounded-3xl p-6 md:p-12 flex flex-col lg:flex-row items-center justify-between shadow-lg shadow-purple-900/30">
            <div className="lg:w-2/3 mb-6 lg:mb-0">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-white">
                Prêt à Commencer Votre Aventure ?
              </h2>
              <p className="text-base md:text-xl text-white/90">
                Rejoignez des milliers d'utilisateurs satisfaits et découvrez un monde de plaisir dès aujourd'hui.
              </p>
            </div>
            <div>
              <Button
                asChild
                size="lg"
                className="bg-white text-[#ff3b8b] hover:bg-white/90 rounded-full text-base md:text-lg px-6 py-5 w-full lg:w-auto shadow-lg shadow-purple-900/20"
              >
                <Link href="/register">Commencer Maintenant</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* LOOLYYB Promotion Section */}
      <section className="py-8 md:py-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a0d2e] to-[#3d1155] opacity-90"></div>
          <div className="absolute inset-0 bg-[url('https://t3.ftcdn.net/jpg/12/40/80/76/240_F_1240807692_IvVnohNpSPVxUXBLRrxuRLdRPWjuw9Vl.jpg')] bg-center bg-cover bg-no-repeat opacity-60"></div>
          <div className="absolute inset-0 bg-[url('/purple-glow-pattern.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="md:w-1/2 text-center md:text-left">
              <p className="text-white text-lg md:text-xl font-medium mb-1">
                LOOLYYB, plus qu'une simple cryptomonnaie
              </p>
              <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-lg">
                C'EST LA <span className="text-[#ff3b8b]">MONNAIE DES LOVERS</span>
              </h2>
              <p className="text-white/90 text-lg md:text-2xl font-medium">
                Investissez dans le LOOLYYB dès maintenant !
              </p>
            </div>
            <div className="md:w-1/2 flex items-center justify-center md:justify-end">
              <div className="flex flex-col space-y-3">
                <Button
                  className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:opacity-90 text-white border-0 shadow-lg shadow-[#ff3b8b]/20"
                  size="lg"
                  asChild
                >
                  <Link href="/loolyyb-memecoin">Acheter</Link>
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                  <Link href="/loolyyb/whitepaper">En savoir plus</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advertisement Banner Bottom */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <AdvertisementBannerBottom />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d1155] mt-8 md:mt-12 py-8 md:py-12">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Love Hotel</h3>
              <p className="text-gray-400 text-sm">
                L'unique application qui relie rencontres virtuelles et plaisirs réels dans des lieux d'exception.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-4">Liens Rapides</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/rencontres" className="text-gray-400 hover:text-white transition-colors">
                    Rencontres
                  </Link>
                </li>
                <li>
                  <Link href="/en-direct" className="text-gray-400 hover:text-white transition-colors">
                    En Direct
                  </Link>
                </li>
                <li>
                  <Link href="/premium" className="text-gray-400 hover:text-white transition-colors">
                    Premium
                  </Link>
                </li>
                <li>
                  <Link href="/love-rooms" className="text-gray-400 hover:text-white transition-colors">
                    Love Rooms
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-4">Informations</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                    À propos
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                    Conditions d'utilisation
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-4">Suivez-nous</h3>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
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
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
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
                    className="h-5 w-5"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
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
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </Link>
              </div>
              <div className="mt-6">
                <h4 className="text-white font-bold text-sm mb-2">Téléchargez notre application</h4>
                <div className="flex space-x-2">
                  <Link href="#" className="block">
                    <Image
                      src="/app-store-badge-generic.png"
                      alt="App Store"
                      width={120}
                      height={40}
                      className="h-10 w-auto"
                    />
                  </Link>
                  <Link href="#" className="block">
                    <Image
                      src="/google-play-badge-generic.png"
                      alt="Google Play"
                      width={120}
                      height={40}
                      className="h-10 w-auto"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2d1155] mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Love Hotel Rencontres. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
