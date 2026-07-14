"use client"

import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Heart, Info, MapPin, Star, Users } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Types pour les données de la Love Room
interface LoveRoomFeature {
  icon: string
  name: string
  description: string
}

interface LoveRoomReview {
  id: number
  userName: string
  userImage: string
  rating: number
  comment: string
  date: string
}

interface LoveRoomTimeSlot {
  id: number
  date: string
  slots: {
    id: number
    time: string
    available: boolean
  }[]
}

export default function LoveRoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null)
  const [isLiked, setIsLiked] = useState(false)

  // Simuler des données de Love Room
  const loveRoom = {
    id: Number.parseInt(id),
    name: "Suite Romantique Deluxe",
    description:
      "Notre Suite Romantique Deluxe est l'endroit parfait pour un moment d'intimité inoubliable. Profitez d'un jacuzzi privatif, d'un lit king-size et d'une ambiance tamisée pour créer des souvenirs mémorables.",
    location: "Love Hotel - Paris",
    price: 150,
    currency: "€",
    rating: 4.8,
    reviewCount: 124,
    images: [
      "/purple-jacuzzi-retreat.png",
      "/twilight-tryst.png",
      "/pink-jacuzzi-night.png",
      "/opulent-rendezvous.png",
    ],
    features: [
      {
        icon: "jacuzzi",
        name: "Jacuzzi privatif",
        description: "Jacuzzi spacieux avec jets massants et chromothérapie",
      },
      {
        icon: "bed",
        name: "Lit king-size",
        description: "Lit extra large avec draps en satin et oreillers moelleux",
      },
      {
        icon: "champagne",
        name: "Bar & Champagne",
        description: "Sélection de champagnes et boissons premium",
      },
      {
        icon: "music",
        name: "Système audio",
        description: "Enceintes Bluetooth pour votre playlist personnelle",
      },
      {
        icon: "lighting",
        name: "Éclairage d'ambiance",
        description: "Lumières LED avec variateur et changement de couleurs",
      },
      {
        icon: "shower",
        name: "Douche à l'italienne",
        description: "Douche spacieuse avec jets massants et produits de luxe",
      },
    ],
    timeSlots: [
      {
        id: 1,
        date: "2025-05-15",
        slots: [
          { id: 101, time: "14:00 - 17:00", available: true },
          { id: 102, time: "18:00 - 21:00", available: true },
          { id: 103, time: "22:00 - 01:00", available: false },
        ],
      },
      {
        id: 2,
        date: "2025-05-16",
        slots: [
          { id: 201, time: "14:00 - 17:00", available: true },
          { id: 202, time: "18:00 - 21:00", available: true },
          { id: 203, time: "22:00 - 01:00", available: true },
        ],
      },
      {
        id: 3,
        date: "2025-05-17",
        slots: [
          { id: 301, time: "14:00 - 17:00", available: false },
          { id: 302, time: "18:00 - 21:00", available: true },
          { id: 303, time: "22:00 - 01:00", available: true },
        ],
      },
    ],
    reviews: [
      {
        id: 1,
        userName: "Sophie",
        userImage: "/serene-woman.png",
        rating: 5,
        comment:
          "Une expérience magique ! Le jacuzzi était parfait et l'ambiance très romantique. Nous reviendrons certainement !",
        date: "Il y a 2 semaines",
      },
      {
        id: 2,
        userName: "Thomas",
        userImage: "/contemplative-man.png",
        rating: 4,
        comment:
          "Très belle suite, confortable et intime. Le service de champagne était excellent. Seul petit bémol : la musique d'ambiance un peu trop forte.",
        date: "Il y a 1 mois",
      },
      {
        id: 3,
        userName: "Julie & Marc",
        userImage: "/vibrant-woman.png",
        rating: 5,
        comment:
          "Tout était parfait ! De la décoration au confort du lit, en passant par le jacuzzi. Un moment hors du temps que nous n'oublierons pas.",
        date: "Il y a 2 mois",
      },
    ],
  }

  const handleReservation = () => {
    if (selectedDate && selectedTimeSlot) {
      // Ici, vous ajouteriez la logique de réservation
      console.log("Réservation pour:", selectedDate, "créneau:", selectedTimeSlot)

      // Rediriger vers une page de confirmation
      router.push(
        `/love-rooms/reservation-confirmation?room=${id}&date=${selectedDate}&slot=${selectedTimeSlot}`,
      )
    }
  }

  // Fonction pour afficher les étoiles de notation
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  // Fonction pour obtenir l'icône correspondante
  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case "jacuzzi":
        return (
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
            <path d="M7 19v-1a2 2 0 0 0-2-2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v1"></path>
            <path d="M12 16h.01"></path>
            <path d="M8 16h.01"></path>
            <path d="M16 16h.01"></path>
            <path d="M12 13h.01"></path>
            <path d="M8 13h.01"></path>
            <path d="M16 13h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M16 10h.01"></path>
          </svg>
        )
      case "bed":
        return (
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
            <path d="M2 4v16"></path>
            <path d="M22 4v16"></path>
            <path d="M2 8h20"></path>
            <path d="M2 16h20"></path>
          </svg>
        )
      case "champagne":
        return (
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
            <path d="M8 22h8"></path>
            <path d="M7 10h10"></path>
            <path d="M12 10v12"></path>
            <path d="M12 6a4 4 0 0 0 4-4H8a4 4 0 0 0 4 4Z"></path>
            <path d="M18 2c-.9 0-1.8.7-2.4 2-.6 1.5-.6 3.1 0 4.6.6 1.3 1.5 2 2.4 2 .9 0 1.8-.7 2.4-2 .6-1.5.6-3.1 0-4.6-.6-1.3-1.5-2-2.4-2Z"></path>
          </svg>
        )
      case "music":
        return (
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
            <circle cx="8" cy="18" r="4"></circle>
            <path d="M12 18V2l7 4"></path>
          </svg>
        )
      case "lighting":
        return (
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
            <path d="M12 2v8"></path>
            <path d="m4.93 10.93 1.41 1.41"></path>
            <path d="M2 18h2"></path>
            <path d="M20 18h2"></path>
            <path d="m19.07 10.93-1.41 1.41"></path>
            <path d="M22 22H2"></path>
            <path d="m8 6 4-4 4 4"></path>
            <path d="M16 18a4 4 0 0 0-8 0"></path>
          </svg>
        )
      case "shower":
        return (
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
            <path d="m4 4 2.5 2.5"></path>
            <path d="M13.5 6.5a4.95 4.95 0 0 0-7 7"></path>
            <path d="M15 5 5 15"></path>
            <path d="M14 17v.01"></path>
            <path d="M10 16v.01"></path>
            <path d="M13 13v.01"></path>
            <path d="M16 10v.01"></path>
            <path d="M11 20v.01"></path>
            <path d="M17 14v.01"></path>
            <path d="M20 11v.01"></path>
          </svg>
        )
      default:
        return <Info className="h-5 w-5" />
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <div className="container py-4 md:py-6 flex-1">
        {/* Bouton retour */}
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
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
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Retour
          </Button>
        </div>

        {/* En-tête avec titre et actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{loveRoom.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>{loveRoom.location}</span>
              <span className="flex items-center gap-1 ml-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span>
                  {loveRoom.rating} ({loveRoom.reviewCount} avis)
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full ${isLiked ? "text-secondary bg-secondary/10" : ""}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`h-5 w-5 ${isLiked ? "fill-secondary" : ""}`} />
            </Button>
            <Button variant="outline" size="sm">
              Partager
            </Button>
          </div>
        </div>

        {/* Galerie d'images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
          <div className="relative aspect-video md:aspect-square rounded-lg overflow-hidden">
            <Image src={loveRoom.images[0] || "/placeholder.svg"} alt={loveRoom.name} fill className="object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {loveRoom.images.slice(1, 4).map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src={image || "/placeholder.svg"}
                  alt={`${loveRoom.name} ${index + 2}`}
                  fill
                  className="object-cover"
                />
                {index === 2 && loveRoom.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{loveRoom.images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Prix et badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{loveRoom.price}</span>
            <span className="text-lg">{loveRoom.currency}</span>
            <span className="text-sm text-muted-foreground">/ session</span>
          </div>
          <Badge className="bg-secondary text-white">Populaire</Badge>
        </div>

        {/* Description */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl font-bold mb-3">Description</h2>
            <p className="text-muted-foreground">{loveRoom.description}</p>
          </CardContent>
        </Card>

        {/* Caractéristiques */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Caractéristiques</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {loveRoom.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getFeatureIcon(feature.icon)}
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Réservation */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Réserver</h2>

            {/* Sélection de date */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Sélectionnez une date</h3>
              <div className="flex flex-wrap gap-2">
                {loveRoom.timeSlots.map((dateSlot) => (
                  <Button
                    key={dateSlot.id}
                    variant={selectedDate === dateSlot.date ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedDate(dateSlot.date)
                      setSelectedTimeSlot(null)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {new Date(dateSlot.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sélection de créneau horaire */}
            {selectedDate && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Sélectionnez un créneau horaire</h3>
                <div className="flex flex-wrap gap-2">
                  {loveRoom.timeSlots
                    .find((dateSlot) => dateSlot.date === selectedDate)
                    ?.slots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedTimeSlot === slot.id ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.id)}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        {slot.time}
                        {!slot.available && <span className="text-xs ml-1">(Complet)</span>}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Bouton de réservation */}
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedDate || !selectedTimeSlot}
              onClick={handleReservation}
            >
              Réserver maintenant
            </Button>
          </CardContent>
        </Card>

        {/* Avis */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Avis ({loveRoom.reviewCount})</h2>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{loveRoom.rating}</span>
              </div>
            </div>

            <div className="space-y-4">
              {loveRoom.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <Image
                      src={review.userImage || "/placeholder.svg"}
                      alt={review.userName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{review.userName}</h3>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                      <div className="my-1">{renderStars(review.rating)}</div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Button variant="outline">Voir tous les avis</Button>
            </div>
          </CardContent>
        </Card>

        {/* Recommandations */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Vous pourriez aussi aimer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((id) => (
              <Link href={`/love-rooms/${id}`} key={id}>
                <Card className="overflow-hidden h-full flex flex-col card-hover">
                  <div className="relative h-40">
                    <Image
                      src={
                        id === 1
                          ? "/twilight-tryst.png"
                          : id === 2
                            ? "/pink-jacuzzi-night.png"
                            : "/opulent-rendezvous.png"
                      }
                      alt={`Love Room ${id}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div className="text-white">
                        <h3 className="font-bold text-lg line-clamp-1">
                          {id === 1 ? "Suite Passion" : id === 2 ? "Love Room Deluxe" : "Suite Luxe"}
                        </h3>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">Love Hotel - Paris</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-secondary/80 backdrop-blur-sm text-xs">
                        {id === 1 ? "120" : id === 2 ? "150" : "180"} € / session
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 md:p-4 flex-grow">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span>{4.5 + id * 0.1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Pour 2 personnes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
