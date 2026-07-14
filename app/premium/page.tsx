"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Check, Star, Gift, Key, Crown, Shield, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import MainLayout from "@/components/layout/main-layout"

export default function PremiumPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#120821]">

        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image src="/opulent-rendezvous.png" alt="Premium Experience" fill className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#120821] via-[#120821]/70 to-[#120821]"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">EXPÉRIENCE PREMIUM</Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Élevez votre Expérience avec <span className="text-[#ff3b8b]">Love Hôtel Premium</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Découvrez des avantages exclusifs, un accès prioritaire et un service personnalisé qui transformeront
                chacune de vos rencontres en moments d'exception.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-8 py-6 text-lg">
                  <Link href="/register?plan=premium">Devenir Premium</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="text-white border-white hover:bg-white/10 rounded-full px-8 py-6 text-lg"
                >
                  <Link href="#pricing">Voir les tarifs</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Benefits Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">AVANTAGES EXCLUSIFS</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Des Privilèges Réservés à Nos Membres Premium
              </h2>
              <p className="text-gray-300">
                En tant que membre Premium, vous bénéficiez d'un traitement VIP et d'avantages exclusifs qui
                transformeront votre expérience Love Hôtel.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                    <Key className="h-7 w-7 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Accès Prioritaire</h3>
                  <p className="text-gray-300 mb-6">
                    Bénéficiez d'un accès prioritaire à toutes nos Love Rooms, événements exclusifs et nouvelles
                    fonctionnalités avant leur lancement officiel.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Réservation prioritaire des Love Rooms
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Places garanties aux événements
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Accès anticipé aux nouvelles fonctionnalités
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                    <Gift className="h-7 w-7 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Conciergerie Privée</h3>
                  <p className="text-gray-300 mb-6">
                    Notre service de conciergerie dédié est à votre disposition 24h/24 pour organiser vos soirées sur
                    mesure et répondre à toutes vos demandes spécifiques.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Assistant personnel dédié
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Organisation d'événements privés
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Service de transport privé
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                    <Crown className="h-7 w-7 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Partenariats Exclusifs</h3>
                  <p className="text-gray-300 mb-6">
                    Profitez d'un accès privilégié à notre réseau de partenaires premium : bars, clubs privés, théâtres
                    d'intimité et bien plus encore.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Entrée VIP dans les clubs partenaires
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Réductions exclusives chez nos partenaires
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Événements privés chez nos partenaires
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                    <Shield className="h-7 w-7 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Confidentialité Renforcée</h3>
                  <p className="text-gray-300 mb-6">
                    Bénéficiez d'une confidentialité maximale avec nos options de profil discret, de navigation privée et
                    d'accès sécurisé à nos établissements.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Mode incognito avancé
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Entrées et sorties discrètes
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Contrôle total de votre visibilité
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-full bg-[#ff3b8b]/20 flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-[#ff3b8b]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Événements Premium</h3>
                  <p className="text-gray-300 mb-6">
                    Participez à des événements exclusifs réservés aux membres premium : soirées privées, after avec
                    brunch et champagne, rencontres VIP.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Soirées VIP mensuelles
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      After exclusifs avec champagne
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Rencontres avec profils sélectionnés
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
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
                      <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Avantages LOOLYYB</h3>
                  <p className="text-gray-300 mb-6">
                    Bénéficiez d'avantages exclusifs avec notre partenaire LOOLYYB, la première cryptomonnaie dédiée au
                    plaisir et aux amoureux.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Tokens LOOLYYB offerts chaque mois
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Réductions exclusives avec LOOLYYB
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Accès anticipé aux nouvelles fonctionnalités
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-[#1a0d2e]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">TARIFS PREMIUM</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Choisissez l'Offre qui Correspond à Vos Désirs
              </h2>
              <p className="text-gray-300">
                Nos formules premium sont conçues pour répondre à tous vos besoins et vous offrir une expérience sur
                mesure. Découvrez nos différentes options et trouvez celle qui vous convient le mieux.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#ff3b8b] text-white px-4 py-1 text-sm">POPULAIRE</div>
                <CardContent className="p-6 pt-12">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium Mensuel</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">49€</span>
                    <span className="text-gray-300 mb-1">/mois</span>
                  </div>
                  <p className="text-gray-300 mb-6">
                    L'accès complet à l'expérience premium avec un engagement mensuel flexible.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Tous les avantages premium
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />1 réservation de Love Room offerte
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Accès à 2 événements exclusifs
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      100 tokens LOOLYYB offerts
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                    <Link href="/register?plan=premium-monthly">Choisir cette offre</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-gradient-to-b from-[#4a2282] to-[#2d1155] border-0 relative overflow-hidden transform scale-105 shadow-xl">
                <div className="absolute top-0 right-0 bg-[#ff3b8b] text-white px-4 py-1 text-sm">MEILLEURE VALEUR</div>
                <CardContent className="p-6 pt-12">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium Annuel</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">39€</span>
                    <span className="text-gray-300 mb-1">/mois</span>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Économisez 20% avec notre formule annuelle et bénéficiez d'avantages supplémentaires.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-white">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Tous les avantages premium
                    </li>
                    <li className="flex items-center text-white">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />2 réservations de Love Room offertes
                    </li>
                    <li className="flex items-center text-white">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Accès à tous les événements exclusifs
                    </li>
                    <li className="flex items-center text-white">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      300 tokens LOOLYYB offerts
                    </li>
                    <li className="flex items-center text-white">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Week-end en hôtel 4★ à -50%
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild className="w-full bg-white text-[#ff3b8b] hover:bg-white/90">
                    <Link href="/register?plan=premium-yearly">Choisir cette offre</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#ff3b8b] text-white px-4 py-1 text-sm">EXCLUSIF</div>
                <CardContent className="p-6 pt-12">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium VIP</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">99€</span>
                    <span className="text-gray-300 mb-1">/mois</span>
                  </div>
                  <p className="text-gray-300 mb-6">
                    L'expérience ultime avec un service sur mesure et des avantages exclusifs illimités.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Tous les avantages premium
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Réservations de Love Room illimitées
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Conciergerie privée 24h/24
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      500 tokens LOOLYYB offerts
                    </li>
                    <li className="flex items-center text-gray-300">
                      <Check className="h-4 w-4 text-[#ff3b8b] mr-2" />
                      Accès à l'espace "Rideaux Ouverts"
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild className="w-full bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                    <Link href="/register?plan=premium-vip">Choisir cette offre</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">TÉMOIGNAGES</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ce que Disent Nos Membres Premium</h2>
              <p className="text-gray-300">
                Découvrez les expériences de nos membres premium et comment notre service a transformé leur vie amoureuse
                et sociale.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Image src="/serene-woman.png" alt="Sophie" width={60} height={60} className="rounded-full" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Sophie, 32 ans</h3>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">
                    "Depuis que je suis membre premium, ma vie sociale a complètement changé. Les événements exclusifs
                    sont d'une qualité exceptionnelle et j'ai rencontré des personnes incroyables. La conciergerie privée
                    est un vrai plus pour organiser des soirées sur mesure."
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Image src="/contemplative-man.png" alt="Thomas" width={60} height={60} className="rounded-full" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Thomas, 38 ans</h3>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">
                    "Les Love Rooms sont simplement incroyables, chacune avec son ambiance unique. En tant que membre
                    premium, j'apprécie particulièrement l'accès prioritaire et la discrétion absolue. Le service est
                    impeccable et les partenariats exclusifs sont un vrai plus."
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Image src="/vibrant-woman.png" alt="Julie" width={60} height={60} className="rounded-full" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Julie & Marc, couple</h3>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">
                    "L'abonnement premium a transformé notre vie de couple. Les week-ends à l'hôtel 4 étoiles sont
                    magiques et les événements exclusifs nous ont permis de rencontrer d'autres couples partageant nos
                    centres d'intérêt. Une expérience que nous recommandons vivement !"
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-[#1a0d2e]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">QUESTIONS FRÉQUENTES</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Tout ce que Vous Devez Savoir sur Premium
              </h2>
              <p className="text-gray-300">
                Vous avez des questions sur notre offre premium ? Retrouvez ici les réponses aux questions les plus
                fréquemment posées.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Comment devenir membre premium ?</h3>
                  <p className="text-gray-300">
                    Pour devenir membre premium, il vous suffit de vous inscrire sur notre plateforme et de choisir
                    l'offre premium qui vous convient. Vous pouvez également upgrader votre compte standard existant à
                    tout moment depuis votre espace personnel.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Puis-je annuler mon abonnement premium ?</h3>
                  <p className="text-gray-300">
                    Oui, vous pouvez annuler votre abonnement premium à tout moment. Pour les abonnements mensuels,
                    l'annulation prendra effet à la fin du mois en cours. Pour les abonnements annuels, vous continuerez à
                    bénéficier des avantages jusqu'à la fin de votre période d'engagement.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Comment fonctionne la conciergerie privée ?</h3>
                  <p className="text-gray-300">
                    Notre service de conciergerie privée est disponible 24h/24 pour nos membres premium. Vous pouvez
                    contacter votre concierge personnel via l'application, par téléphone ou par email. Il se chargera
                    d'organiser vos soirées, de réserver vos Love Rooms et de répondre à toutes vos demandes spécifiques.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Qu'est-ce que LOOLYYB ?</h3>
                  <p className="text-gray-300">
                    LOOLYYB est la première cryptomonnaie dédiée au plaisir et aux amoureux. En tant que membre premium,
                    vous recevez des tokens LOOLYYB que vous pouvez utiliser pour payer vos réservations, accéder à des
                    avantages exclusifs et bénéficier de réductions chez nos partenaires.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-[#4a2282] to-[#ff3b8b] rounded-3xl p-12 flex flex-col lg:flex-row items-center justify-between">
              <div className="lg:w-2/3 mb-8 lg:mb-0">
                <h2 className="text-4xl font-bold mb-4 text-white">Prêt à Vivre l'Expérience Premium ?</h2>
                <p className="text-xl text-white/90">
                  Rejoignez notre communauté de membres premium et découvrez un monde d'avantages exclusifs et
                  d'expériences inoubliables.
                </p>
              </div>
              <div>
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[#ff3b8b] hover:bg-white/90 rounded-full text-lg px-8 py-6"
                >
                  <Link href="/register?plan=premium">Devenir Premium</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
