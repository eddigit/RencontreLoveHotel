"use client"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/contexts/notification-context"
import { AuthProvider } from "@/contexts/auth-context"
import { SessionProvider } from "next-auth/react"
import { LoolyyBWidget } from "@/components/loolyyb-widget"
import { NoSSR } from "@/components/no-ssr"
import { PresenceHeartbeat } from "@/components/presence-heartbeat"
import { ActivityEmailConsentPrompt } from '@/components/activity-email-consent-prompt'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NoSSR>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <SessionProvider>
          <AuthProvider>
            <PresenceHeartbeat />
            <ActivityEmailConsentPrompt />
            <NotificationProvider>
              {children}
              <LoolyyBWidget />
            </NotificationProvider>
          </AuthProvider>
        </SessionProvider>
      </ThemeProvider>
    </NoSSR>
  )
}
