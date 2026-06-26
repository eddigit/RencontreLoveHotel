"use client"

import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import MainLayout from "@/components/layout/main-layout"

export default function UnauthorizedPage() {
  const { user } = useAuth()

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Shield className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Accès non autorisé</h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          {user && (
            <span className="block mt-2">
              Vous êtes connecté en tant que <strong>{user.name}</strong> avec le rôle <strong>{user.role}</strong>.
            </span>
          )}
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/">Retour à l'accueil</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Changer de compte</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
