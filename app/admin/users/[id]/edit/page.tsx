"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserProfile, updateUserByAdmin } from "@/actions/user-actions"
import { ProtectedRoute } from "@/components/protected-route"
import MainLayout from "@/components/layout/main-layout"
import { AdminTabs } from "@/components/admin-tabs"
import { AdminHeader } from "@/components/admin-header"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export default function AdminUserEditPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const { user: authUser } = useAuth()
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "user",
    avatar: ""
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchUser() {
      setLoading(true)
      const data = await getUserProfile(userId)
      if (data && data.user) {
        setForm({
          name: data.user.name || "",
          email: data.user.email || "",
          role: data.user.role || "user",
          avatar: data.user.avatar || ""
        })
      }
      setLoading(false)
    }
    if (userId) fetchUser()
  }, [userId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await updateUserByAdmin(userId, form)
      router.push("/admin/users")
    } catch (err) {
      setError("Erreur lors de la modification de l'utilisateur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MainLayout user={authUser}>
        <div className="container py-10 max-w-xl">
          <AdminHeader user={authUser} />
          <AdminTabs />
          <Button asChild variant="outline" className="mb-4">
            <Link href="/admin/users">← Retour</Link>
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Modifier l'utilisateur</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Chargement...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input name="name" placeholder="Nom" value={form.name} onChange={handleChange} className="w-full border rounded p-2" required />
                  <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full border rounded p-2" required />
                  <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded p-2">
                    <option value="user">Utilisateur</option>
                    <option value="community_moderator">Adhérent-modérateur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input name="avatar" placeholder="Avatar (URL)" value={form.avatar} onChange={handleChange} className="w-full border rounded p-2" />
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Modification..." : "Enregistrer les modifications"}</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
