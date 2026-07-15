"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useRouter } from "next/navigation"

import { saveUserPreferences } from "@/app/actions"
import { useAuth } from "@/contexts/auth-context"

// Types pour les données du formulaire
export interface OnboardingData {
  // Étape 1: Informations personnelles
  status: "couple" | "single_male" | "single_female" | ""
  age: number | null
  orientation: "hetero" | "homo" | "bi" | ""
  gender: "male" | "female" | "other" | "" // Added gender
  birthday: string // Changed from birthdate to birthday

  // Étape 2: Préférences et motivations
  interestedInRestaurant: boolean
  interestedInEvents: boolean
  interestedInDating: boolean
  preferCurtainOpen: boolean
  interestedInLolib: boolean
  suggestions: string

  // Étape 3: Personnalisation du profil
  meetingTypes: {
    friendly: boolean
    romantic: boolean
    playful: boolean
    openCurtains: boolean
    libertine: boolean
  }
  openToOtherCouples: boolean
  specificPreferences: string

  // Étape 4: Options supplémentaires
  joinExclusiveEvents: boolean
  premiumAccess: boolean
}

// Valeurs initiales
const initialData: OnboardingData = {
  status: "",
  age: null,
  orientation: "",
  gender: "", // Added gender
  birthday: "", // Changed from birthdate to birthday

  interestedInRestaurant: false,
  interestedInEvents: false,
  interestedInDating: false,
  preferCurtainOpen: false,
  interestedInLolib: false,
  suggestions: "",

  meetingTypes: {
    friendly: false,
    romantic: false,
    playful: false,
    openCurtains: false,
    libertine: false,
  },
  openToOtherCouples: false,
  specificPreferences: "",

  joinExclusiveEvents: false,
  premiumAccess: false,
}

// Modifier la fonction OnboardingForm pour utiliser la base de données
export function OnboardingForm({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>(initialData)
  const router = useRouter()
  const { user, completeOnboarding } = useAuth()

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData((prev) => {
      const currentValue = prev[parent as keyof OnboardingData]
      const currentObject =
        typeof currentValue === 'object' && currentValue !== null
          ? currentValue
          : {}

      return {
        ...prev,
        [parent]: {
          ...currentObject,
          [field]: value,
        },
      }
    })
  }

  // Modifier la fonction nextStep pour sauvegarder les données dans la base de données à la dernière étape
  const nextStep = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
      window.scrollTo(0, 0)
    } else {
      // À la dernière étape, sauvegarder les données dans la base de données
      if (user) {
        // Vérifier que l'ID utilisateur est un UUID avant de sauvegarder
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
        if (!isValidUUID) {
          alert("Votre compte n'est pas encore prêt pour l'onboarding. Merci de vous reconnecter ou de contacter le support.")
          return
        }
        try {
          const result = await saveUserPreferences(user.id, formData)
          if (result.success) {
            // Mettre à jour le statut d'onboarding dans le contexte d'authentification
            await completeOnboarding()
            // Appeler la fonction onComplete
            onComplete(formData)
          } else {
            console.error("Erreur lors de la sauvegarde des préférences")
            alert("Erreur lors de la sauvegarde des préférences. Merci de réessayer ou de contacter le support.")
          }
        } catch (error) {
          console.error("Erreur lors de la sauvegarde des préférences:", error)
          alert("Erreur lors de la sauvegarde des préférences. Merci de réessayer ou de contacter le support.")
        }
      } else {
        // Si l'utilisateur n'est pas connecté, simplement appeler onComplete
        onComplete(formData)
      }
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
      window.scrollTo(0, 0)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.status !== "" &&
          formData.age !== null &&
          formData.orientation !== "" &&
          formData.gender !== "" &&
          formData.birthday !== ""
        )
      case 2:
        return true // Toutes les options sont facultatives dans cette étape
      case 3:
        return Object.values(formData.meetingTypes).some((value) => value === true) // Au moins un type de rencontre doit être sélectionné
      case 4:
        return true // Toutes les options sont facultatives dans cette étape
      default:
        return false
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-0 shadow-lg shadow-purple-900/20 bg-gradient-to-b from-[#2d1155]/90 to-[#1a0d2e]/90 text-white">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Personnalisation de votre profil</CardTitle>
          <div className="text-sm font-medium">
            Étape {step}/{totalSteps}
          </div>
        </div>
        <CardDescription className="text-purple-200/80">
          Aidez-nous à mieux vous connaître pour des rencontres plus adaptées
        </CardDescription>
        <Progress
          value={progress}
          className="h-1 bg-purple-900/30"
          indicatorClassName="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8]"
        />
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-purple-100">
                Votre statut
              </Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value) => updateFormData("status", value)}
                className="grid grid-cols-1 gap-2"
              >
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="couple" id="status-couple" className="border-purple-500" />
                  <Label htmlFor="status-couple" className="flex-1 cursor-pointer">
                    Couple
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="single_male" id="status-single-male" className="border-purple-500" />
                  <Label htmlFor="status-single-male" className="flex-1 cursor-pointer">
                    Homme seul
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="single_female" id="status-single-female" className="border-purple-500" />
                  <Label htmlFor="status-single-female" className="flex-1 cursor-pointer">
                    Femme seule
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-purple-100">
                Votre âge
              </Label>
              <Select
                value={formData.age?.toString() || ""}
                onValueChange={(value) => updateFormData("age", Number.parseInt(value))}
              >
                <SelectTrigger id="age" className="bg-purple-900/20 border-purple-800/50 focus:ring-[#ff3b8b]">
                  <SelectValue placeholder="Sélectionnez votre âge" />
                </SelectTrigger>
                <SelectContent className="bg-[#2d1155] border-purple-800/50">
                  {Array.from({ length: 62 }, (_, i) => i + 18).map((age) => (
                    <SelectItem key={age} value={age.toString()} className="focus:bg-[#ff3b8b]/20">
                      {age} ans
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orientation" className="text-purple-100">
                Votre orientation
              </Label>
              <RadioGroup
                value={formData.orientation}
                onValueChange={(value) => updateFormData("orientation", value)}
                className="grid grid-cols-1 gap-2"
              >
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="hetero" id="orientation-hetero" className="border-purple-500" />
                  <Label htmlFor="orientation-hetero" className="flex-1 cursor-pointer">
                    Hétérosexuel(le)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="homo" id="orientation-homo" className="border-purple-500" />
                  <Label htmlFor="orientation-homo" className="flex-1 cursor-pointer">
                    Homosexuel(le)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                  <RadioGroupItem value="bi" id="orientation-bi" className="border-purple-500" />
                  <Label htmlFor="orientation-bi" className="flex-1 cursor-pointer">
                    Bisexuel(le)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-purple-100">
                Genre
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => updateFormData("gender", value)}
              >
                <SelectTrigger id="gender" className="bg-purple-900/20 border-purple-800/50 focus:ring-[#ff3b8b]">
                  <SelectValue placeholder="Sélectionnez votre genre" />
                </SelectTrigger>
                <SelectContent className="bg-[#2d1155] border-purple-800/50">
                  <SelectItem value="male" className="focus:bg-[#ff3b8b]/20">
                    Homme
                  </SelectItem>
                  <SelectItem value="female" className="focus:bg-[#ff3b8b]/20">
                    Femme
                  </SelectItem>
                  <SelectItem value="other" className="focus:bg-[#ff3b8b]/20">
                    Autre
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday" className="text-purple-100">
                Date de naissance
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => updateFormData("birthday", e.target.value)}
                className="bg-purple-900/20 border-purple-800/50 focus:ring-[#ff3b8b] focus:border-[#ff3b8b] text-white"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-purple-100 block mb-2">Vos centres d'intérêt au Love Hôtel</Label>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="events"
                  checked={formData.interestedInEvents}
                  onCheckedChange={(checked) => updateFormData("interestedInEvents", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="events" className="font-medium cursor-pointer">
                    Événements du Love Hôtel
                  </Label>
                  <p className="text-sm text-purple-200/70">Speed dating, soirées thématiques, etc.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="dating"
                  checked={formData.interestedInDating}
                  onCheckedChange={(checked) => updateFormData("interestedInDating", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="dating" className="font-medium cursor-pointer">
                    Site de rencontres
                  </Label>
                  <p className="text-sm text-purple-200/70">Rencontrer de nouvelles personnes via notre plateforme</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="curtain"
                  checked={formData.preferCurtainOpen}
                  onCheckedChange={(checked) => updateFormData("preferCurtainOpen", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="curtain" className="font-medium cursor-pointer">
                    Option rideau ouvert
                  </Label>
                  <p className="text-sm text-purple-200/70">Préférence pour les chambres avec rideau ouvert</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="lolib"
                  checked={formData.interestedInLolib}
                  onCheckedChange={(checked) => updateFormData("interestedInLolib", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="lolib" className="font-medium cursor-pointer">
                    Monnaie Lolib
                  </Label>
                  <p className="text-sm text-purple-200/70">Gagner ou acheter notre monnaie virtuelle</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="suggestions" className="text-purple-100">
                Vos suggestions
              </Label>
              <Textarea
                id="suggestions"
                placeholder="Partagez vos idées d'événements ou de fonctionnalités..."
                value={formData.suggestions}
                onChange={(e) => updateFormData("suggestions", e.target.value)}
                className="min-h-[100px] bg-purple-900/20 border-purple-800/50 focus:border-[#ff3b8b] focus:ring-[#ff3b8b]"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-purple-100 block mb-2">Types de rencontres recherchées</Label>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="friendly"
                  checked={formData.meetingTypes.friendly}
                  onCheckedChange={(checked) => updateNestedFormData("meetingTypes", "friendly", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="friendly" className="font-medium cursor-pointer">
                    Rencontres amicales
                  </Label>
                  <p className="text-sm text-purple-200/70">Élargir votre cercle social</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="romantic"
                  checked={formData.meetingTypes.romantic}
                  onCheckedChange={(checked) => updateNestedFormData("meetingTypes", "romantic", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="romantic" className="font-medium cursor-pointer">
                    Rencontres romantiques
                  </Label>
                  <p className="text-sm text-purple-200/70">Trouver l'amour ou une relation sérieuse</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="playful"
                  checked={formData.meetingTypes.playful}
                  onCheckedChange={(checked) => updateNestedFormData("meetingTypes", "playful", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="playful" className="font-medium cursor-pointer">
                    Rencontres ludiques
                  </Label>
                  <p className="text-sm text-purple-200/70">Moments de plaisir sans engagement</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="openCurtains"
                  checked={formData.meetingTypes.openCurtains}
                  onCheckedChange={(checked) => updateNestedFormData("meetingTypes", "openCurtains", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="openCurtains" className="font-medium cursor-pointer">
                    Rideaux ouverts
                  </Label>
                  <p className="text-sm text-purple-200/70">Expériences avec rideaux ouverts</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="libertine"
                  checked={formData.meetingTypes.libertine}
                  onCheckedChange={(checked) => updateNestedFormData("meetingTypes", "libertine", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="libertine" className="font-medium cursor-pointer">
                    Afters libertins
                  </Label>
                  <p className="text-sm text-purple-200/70">Rencontres libertines après événements</p>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20 mt-4">
              <Checkbox
                id="openToOtherCouples"
                checked={formData.openToOtherCouples}
                onCheckedChange={(checked) => updateFormData("openToOtherCouples", checked === true)}
                className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
              />
              <div className="space-y-1">
                <Label htmlFor="openToOtherCouples" className="font-medium cursor-pointer">
                  Ouvert(e) aux autres couples
                </Label>
                <p className="text-sm text-purple-200/70">Intéressé(e) par des rencontres avec d'autres couples</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="specificPreferences" className="text-purple-100">
                Préférences spécifiques
              </Label>
              <Textarea
                id="specificPreferences"
                placeholder="Décrivez vos critères ou préférences particulières..."
                value={formData.specificPreferences}
                onChange={(e) => updateFormData("specificPreferences", e.target.value)}
                className="min-h-[100px] bg-purple-900/20 border-purple-800/50 focus:border-[#ff3b8b] focus:ring-[#ff3b8b]"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-purple-100 block mb-2">Options supplémentaires</Label>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="exclusiveEvents"
                  checked={formData.joinExclusiveEvents}
                  onCheckedChange={(checked) => updateFormData("joinExclusiveEvents", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="exclusiveEvents" className="font-medium cursor-pointer">
                    Événements exclusifs
                  </Label>
                  <p className="text-sm text-purple-200/70">
                    Participer aux événements réservés aux membres sélectionnés
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-purple-800/50 p-3 bg-purple-900/20">
                <Checkbox
                  id="premiumAccess"
                  checked={formData.premiumAccess}
                  onCheckedChange={(checked) => updateFormData("premiumAccess", checked === true)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-[#ff3b8b] data-[state=checked]:border-[#ff3b8b]"
                />
                <div className="space-y-1">
                  <Label htmlFor="premiumAccess" className="font-medium cursor-pointer">
                    Accès Premium
                  </Label>
                  <p className="text-sm text-purple-200/70">
                    Débloquer toutes les fonctionnalités avancées de l'application
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-[#ff3b8b]/30 p-4 bg-[#ff3b8b]/10 mt-4">
              <h3 className="font-medium text-[#ff8cc8] mb-2">Félicitations !</h3>
              <p className="text-sm text-purple-100/90">
                Votre profil est presque complet. En validant cette dernière étape, vous pourrez accéder à toutes les
                fonctionnalités de matching et commencer à faire des rencontres adaptées à vos préférences.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          className="border-purple-800/50 bg-purple-900/20 hover:bg-purple-900/40 text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>

        <Button
          onClick={nextStep}
          disabled={!isStepValid()}
          className="bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:from-[#ff3b8b]/90 hover:to-[#ff8cc8]/90 text-white border-0"
        >
          {step === totalSteps ? (
            <>
              Terminer
              <Check className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
