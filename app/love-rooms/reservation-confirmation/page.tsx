"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Calendar, Clock, MapPin, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import MainLayout from "@/components/layout/main-layout"


export default function ReservationConfirmationPage() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get("room")
  const date = searchParams.get("date")
  const slotId = searchParams.get("slot")

  // Simuler des données de réservation
  const reservation = {
    id: "RES-" + Math.floor(Math.random() * 10000),
    roomId: roomId || "1",
    roomName: roomId === "1" ? "Suite Romantique Deluxe" : roomId === "2" ? "Love Room Deluxe" : "Suite Passion",
    location: "Love Hotel - Paris",
    date: date
      ? new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "15 mai 2025",
    timeSlot:
      slotId === "101" || slotId === "201" || slotId === "301"
        ? "14:00 - 17:00"
        : slotId === "102" || slotId === "202" || slotId === "302"
          ? "18:00 - 21:00"
          : "22:00 - 01:00",
    price: 150,
    currency: "€",
    image:
      roomId === "1"
        ? "/purple-jacuzzi-retreat.png"
        : roomId === "2"
          ? "/pink-jacuzzi-night.png"
          : "/twilight-tryst.png",
  }

  return (<MainLayout>
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <div className="container py-4 md:py-6 flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Réservation confirmée !</h1>
            <p className="text-muted-foreground mt-2">
              Votre Love Room a été réservée avec succès. Vous recevrez un email de confirmation.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Détails de la réservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative h-40 rounded-lg overflow-hidden">
                <Image
                  src={reservation.image || "/placeholder.svg"}
                  alt={reservation.roomName}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <div className="text-white">
                    <h3 className="font-bold text-lg">{reservation.roomName}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>{reservation.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro de réservation</p>
                    <p className="font-medium">{reservation.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prix</p>
                    <p className="font-medium">
                      {reservation.price} {reservation.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="font-medium">{reservation.date}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horaire</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="font-medium">{reservation.timeSlot}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                <p>Vous pouvez annuler gratuitement jusqu'à 24h avant votre réservation.</p>
                <p>Pour toute question, contactez notre service client au 01 23 45 67 89.</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/love-rooms">Voir d'autres Love Rooms</Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/profile">
                    Mes réservations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

    </div></MainLayout>
  )
}
