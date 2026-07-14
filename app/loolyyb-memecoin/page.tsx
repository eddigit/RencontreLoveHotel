"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { AdvertisementBanner } from "@/components/advertisement-banner"

export default function LoolyyBMemeCoinPage() {
  return (
    <div className="min-h-screen bg-[#120821] overflow-x-hidden">

      {/* Hero Section */}
      <section className="py-8 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0 w-full h-full">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1a0d2e] via-[#3d1155] to-[#1a0d2e] opacity-90"></div>
          <div className="absolute inset-0 w-full h-full bg-[url('/purple-glow-pattern.png')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4">
              <span className="text-[#ff3b8b]">LOOLYYB</span> MEME COIN
            </h1>
            <p className="text-xl text-white/80 mb-8">
              La première cryptomonnaie exclusive pour les membres Lover's du Love Hotel
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0 w-full h-full">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1a0d2e] via-[#3d1155] to-[#1a0d2e] opacity-90"></div>
          <div className="absolute inset-0 w-full h-full bg-[url('/purple-glow-pattern.png')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container px-4 relative z-10">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Pourquoi investir dans <span className="text-[#ff3b8b]">LOOLYYB</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-6">
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
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Exclusivité Membres</h3>
              <p className="text-gray-300 text-base">
                Réservé aux membres du Love Hotel, créant une communauté financière exclusive et privilégiée.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-6">
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
                  <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Avantages Premium</h3>
              <p className="text-gray-300 text-base">
                Accès à des services VIP, réductions exclusives et priorité sur les réservations de Love Rooms.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <div className="h-14 w-14 bg-gradient-to-br from-[#ff3b8b]/30 to-[#ff8cc8]/20 rounded-full flex items-center justify-center mb-6">
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
                  <path d="M12 22V8"></path>
                  <path d="m5 12 7-4 7 4"></path>
                  <path d="M5 16l7-4 7 4"></path>
                  <path d="M5 20l7-4 7 4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Potentiel de Croissance</h3>
              <p className="text-gray-300 text-base">
                Investissement dans l'écosystème Love Hotel en pleine expansion avec une valeur qui augmente avec la
                communauté.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0 w-full h-full">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1a0d2e] via-[#3d1155] to-[#1a0d2e] opacity-90"></div>
          <div className="absolute inset-0 w-full h-full bg-[url('/purple-glow-pattern.png')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Packs de Tokens <span className="text-[#ff3b8b]">LOOLYYB</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-[#2d1155]/80 to-[#3d1155]/60 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/30 shadow-lg shadow-purple-900/20 flex flex-col w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Pack Découverte</h3>
              <div className="text-4xl font-black mb-4 text-white">
                100 <span className="text-[#ff3b8b]">LOOLYYB</span>
              </div>
              <p className="text-gray-300 text-base mb-4">Idéal pour débuter votre collection de tokens LOOLYYB</p>
              <ul className="space-y-2 mb-6 flex-grow">
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Accès aux événements standards
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  5% de réduction sur les Love Rooms
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Badge membre LOOLYYB
                </li>
              </ul>
              <div className="text-2xl font-bold mb-4 text-white">49€</div>
              <Button className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:opacity-90 text-white border-0 shadow-lg shadow-[#ff3b8b]/20 w-full">
                Acheter ce pack
              </Button>
            </div>

            <div className="bg-gradient-to-br from-[#ff3b8b]/20 to-[#3d1155]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#ff3b8b]/30 shadow-lg shadow-[#ff3b8b]/20 flex flex-col relative w-full">
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <span className="bg-[#ff3b8b] text-white text-sm font-bold px-4 py-1 rounded-full">POPULAIRE</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Pack Passionné</h3>
              <div className="text-4xl font-black mb-4 text-white">
                500 <span className="text-[#ff3b8b]">LOOLYYB</span>
              </div>
              <p className="text-gray-300 text-base mb-4">Notre offre la plus populaire avec des avantages exclusifs</p>
              <ul className="space-y-2 mb-6 flex-grow">
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Accès prioritaire aux événements
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  15% de réduction sur les Love Rooms
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Badge membre LOOLYYB Gold
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  1 réservation jacuzzi offerte
                </li>
              </ul>
              <div className="text-2xl font-bold mb-4 text-white">199€</div>
              <Button className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:opacity-90 text-white border-0 shadow-lg shadow-[#ff3b8b]/20 w-full">
                Acheter ce pack
              </Button>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/80 to-[#3d1155]/60 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/30 shadow-lg shadow-purple-900/20 flex flex-col w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Pack VIP</h3>
              <div className="text-4xl font-black mb-4 text-white">
                2000 <span className="text-[#ff3b8b]">LOOLYYB</span>
              </div>
              <p className="text-gray-300 text-base mb-4">Pour les véritables connaisseurs et investisseurs</p>
              <ul className="space-y-2 mb-6 flex-grow">
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Accès VIP à tous les événements
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  30% de réduction sur les Love Rooms
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Badge membre LOOLYYB Diamond
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  3 réservations Love Room offertes
                </li>
                <li className="flex items-center text-gray-300">
                  <svg className="h-5 w-5 mr-2 text-[#ff3b8b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Concierge personnel 24/7
                </li>
              </ul>
              <div className="text-2xl font-bold mb-4 text-white">699€</div>
              <Button className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:opacity-90 text-white border-0 shadow-lg shadow-[#ff3b8b]/20 w-full">
                Acheter ce pack
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Questions Fréquentes</h2>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <h3 className="text-xl font-bold mb-3 text-white">Qu'est-ce que LOOLYYB ?</h3>
              <p className="text-gray-300">
                LOOLYYB est une cryptomonnaie partenaire exclusive du Love Hotel. Elle offre des avantages uniques dans
                notre écosystème et peut être utilisée pour des services premium.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <h3 className="text-xl font-bold mb-3 text-white">Comment utiliser mes tokens LOOLYYB ?</h3>
              <p className="text-gray-300">
                Vos tokens LOOLYYB peuvent être utilisés pour réserver des Love Rooms, accéder à des événements
                exclusifs, obtenir des réductions et débloquer des fonctionnalités premium sur la plateforme.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <h3 className="text-xl font-bold mb-3 text-white">Les tokens LOOLYYB ont-ils une valeur réelle ?</h3>
              <p className="text-gray-300">
                Oui, les tokens LOOLYYB ont une valeur réelle au sein de l'écosystème Love Hotel. Leur valeur augmente
                avec la croissance de notre communauté et l'expansion de nos services.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-800/20 shadow-lg shadow-purple-900/20 w-full">
              <h3 className="text-xl font-bold mb-3 text-white">Comment acheter des tokens LOOLYYB ?</h3>
              <p className="text-gray-300">
                Vous pouvez acheter des tokens LOOLYYB directement sur cette page en choisissant l'un de nos packs. Le
                paiement est sécurisé et les tokens sont immédiatement crédités sur votre compte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advertisement Banner */}
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <AdvertisementBanner />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 md:py-16">
        <div className="container px-4">
          <div className="bg-gradient-to-r from-[#3d1155] to-[#ff3b8b] rounded-3xl p-6 md:p-12 flex flex-col lg:flex-row items-center justify-between shadow-lg shadow-purple-900/30">
            <div className="lg:w-2/3 mb-6 lg:mb-0">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-white">
                Prêt à rejoindre la révolution LOOLYYB ?
              </h2>
              <p className="text-base md:text-xl text-white/90">
                Investissez dès maintenant dans la cryptomonnaie des Lover's et accédez à un monde d'avantages
                exclusifs.
              </p>
            </div>
            <div>
              <Button
                size="lg"
                className="bg-white text-[#ff3b8b] hover:bg-white/90 rounded-full text-base md:text-lg px-6 py-5 w-full lg:w-auto shadow-lg shadow-purple-900/20"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Acheter des tokens
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="hidden" aria-hidden='true'>
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
      </div>
    </div>
  )
}
