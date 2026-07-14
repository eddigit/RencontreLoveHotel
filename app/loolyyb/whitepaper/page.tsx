"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-[#120821]">

      {/* Header */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/loolyyb">
                <ArrowLeft className="h-4 w-4" /> Retour
              </Link>
            </Button>
          </div>

          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-[#ff3b8b] text-white px-3 py-1 text-sm">DOCUMENTATION</Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">LOOLYYB Whitepaper</h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-gray-300">
                <FileText className="h-4 w-4" />
                <span>Version 1.0</span>
              </div>
              <div className="text-gray-300">|</div>
              <div className="text-gray-300">Avril 2025</div>
            </div>

            <Card className="bg-[#2d1155]/50 backdrop-blur-sm border-0 mb-8">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Télécharger le Whitepaper complet</h2>
                    <p className="text-gray-300 text-sm">PDF - 4.2 MB</p>
                  </div>
                  <Button className="bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white">
                    <Download className="mr-2 h-4 w-4" /> Télécharger
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="prose prose-invert max-w-none">
              <h2>Introduction</h2>
              <p>
                LOOLYYB est la première cryptomonnaie spécifiquement conçue pour l'industrie du divertissement pour
                adultes, avec un accent particulier sur les expériences VR et les services premium.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
