"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Star, Zap } from "lucide-react"
import Link from "next/link"

export default function LoolyyBPage() {
  return (
    <div className="min-h-screen bg-[#120821]">

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0d2e] to-[#3d1155] opacity-90"></div>
          <div className="absolute inset-0 bg-[url('/purple-glow-pattern.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">LA CRYPTO DU PLAISIR</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              LOOLYYB: <span className="text-[#ff3b8b]">La Première Cryptomonnaie</span> Dédiée au Plaisir
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Rejoignez la révolution financière qui transforme l'industrie du divertissement pour adultes. LOOLYYB
              n'est pas juste une cryptomonnaie, c'est un écosystème complet.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-8 py-6 text-lg">
                <Link href="#buy">Acheter LOOLYYB</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="text-white border-white hover:bg-white/10 rounded-full px-8 py-6 text-lg"
              >
                <Link href="/loolyyb/whitepaper">Whitepaper</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-12">
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">$0.0042</div>
              <div className="text-gray-300">Prix actuel</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">$4.2M</div>
              <div className="text-gray-300">Capitalisation</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">42K+</div>
              <div className="text-gray-300">Détenteurs</div>
            </div>
            <div className="bg-[#2d1155]/50 backdrop-blur-sm p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-white">+69%</div>
              <div className="text-gray-300">Croissance 30j</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">CARACTÉRISTIQUES</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pourquoi Investir dans <span className="text-[#ff3b8b]">LOOLYYB</span>
            </h2>
            <p className="text-gray-300">
              LOOLYYB n'est pas seulement une cryptomonnaie, c'est une révolution dans l'industrie du divertissement
              pour adultes, offrant des avantages uniques à ses détenteurs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
              <CardContent className="p-6">
                <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-[#ff3b8b]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Paiements Anonymes</h3>
                <p className="text-gray-300 mb-6">
                  Effectuez des transactions discrètes et sécurisées pour tous vos achats liés au divertissement pour
                  adultes, sans laisser de trace sur vos relevés bancaires.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
              <CardContent className="p-6">
                <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-[#ff3b8b]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Accès VR Premium</h3>
                <p className="text-gray-300 mb-6">
                  Les détenteurs de LOOLYYB bénéficient d'un accès exclusif à du contenu VR premium et à des expériences
                  immersives de haute qualité.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
              <CardContent className="p-6">
                <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                  <Star className="h-7 w-7 text-[#ff3b8b]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Récompenses & Cashback</h3>
                <p className="text-gray-300 mb-6">
                  Gagnez des récompenses et du cashback sur toutes vos transactions dans l'écosystème LOOLYYB, y compris
                  dans les Love Hotels et sur les plateformes partenaires.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
