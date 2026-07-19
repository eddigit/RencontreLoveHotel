"use client"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/contexts/notification-context"
import { AuthProvider } from "@/contexts/auth-context"
import { SessionProvider } from "next-auth/react"
import { NoSSR } from "@/components/no-ssr"
import { PresenceHeartbeat } from "@/components/presence-heartbeat"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NoSSR>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <SessionProvider>
          <AuthProvider>
            <PresenceHeartbeat />
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </AuthProvider>
        </SessionProvider>
      </ThemeProvider>
    </NoSSR>
  )
}
