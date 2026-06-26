import { Button } from "@/components/ui/button"
import Link from "next/link"
import MainLayout from "@/components/layout/main-layout"

export default function PublicitePage() {
  // Calculs de visibilité
  const visiteursJour = 1200
  const visiteursParMois = visiteursJour * 30
  const visiteursParAn = visiteursJour * 365
  const membres = 20000

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Pourquoi choisir notre plateforme pour votre publicité ?
          </h1>

          <div className="bg-gradient-to-r from-purple-900 to-pink-800 text-white p-6 rounded-lg shadow-lg mb-10">
            <p className="text-xl mb-4">
              Maximisez votre visibilité et touchez une audience ciblée et engagée grâce à nos espaces publicitaires
              premium.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-r from-purple-900 to-pink-800 text-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Notre application</h2>
              <p className="text-lg mb-4">
                Accédez à une communauté de <span className="font-bold text-pink-300">{membres.toLocaleString()}</span>{" "}
                membres actifs et engagés.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Audience ciblée et qualifiée</li>
                <li>Forte interaction des utilisateurs</li>
                <li>Visibilité optimale sur toutes les pages</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-pink-800 to-purple-900 text-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Notre site Love Hôtel</h2>
              <p className="text-lg mb-4">
                Bénéficiez d'une exposition quotidienne auprès de{" "}
                <span className="font-bold text-pink-300">{visiteursJour.toLocaleString()}</span> visiteurs.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Trafic qualifié et régulier</li>
                <li>Positionnement stratégique de votre publicité</li>
                <li>Intégration naturelle dans notre contenu premium</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-800 to-pink-700 text-white p-8 rounded-lg shadow-md mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Impact de votre publicité</h2>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-200">Par jour</p>
                <p className="text-3xl font-bold text-white">{visiteursJour.toLocaleString()}</p>
                <p className="text-sm">impressions</p>
              </div>

              <div className="bg-gradient-to-r from-pink-900 to-purple-900 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-200">Par mois</p>
                <p className="text-3xl font-bold text-white">{visiteursParMois.toLocaleString()}</p>
                <p className="text-sm">impressions</p>
              </div>

              <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-200">Par an</p>
                <p className="text-3xl font-bold text-white">{visiteursParAn.toLocaleString()}</p>
                <p className="text-sm">impressions</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-800 to-purple-900 text-white p-8 rounded-lg shadow-lg mb-12">
            <h2 className="text-2xl font-bold mb-4 text-center">Pourquoi nous choisir ?</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Visibilité garantie</h3>
                <p>
                  Votre publicité sera vue par notre communauté active et engagée, garantissant une exposition maximale.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Audience ciblée</h3>
                <p>Touchez directement les personnes intéressées par vos produits ou services.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Rapports détaillés</h3>
                <p>Recevez des analyses complètes sur les performances de votre publicité.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Support dédié</h3>
                <p>Notre équipe est à votre disposition pour optimiser votre campagne publicitaire.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">Prêt à augmenter votre visibilité ?</h2>

            <div className="flex flex-col md:flex-row justify-center gap-4">
              <Link href="/contact">
                <Button className="bg-purple-800 hover:bg-purple-900 text-white px-8 py-3 rounded-full">
                  Contactez-nous
                </Button>
              </Link>

              <Link href="/tarifs-publicite">
                <Button
                  variant="outline"
                  className="border-purple-800 text-purple-800 hover:bg-purple-800 hover:text-white px-8 py-3 rounded-full"
                >
                  Voir nos tarifs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
