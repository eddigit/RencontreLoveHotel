"use client"

import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, markResourceNotificationsAsRead } from "@/app/actions"
import { useAuth } from "@/contexts/auth-context"
import type { Notification } from "@/components/notifications-dropdown"
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'

type NotificationCounts = {
  total: number
  messages: number
  events: number
  likes: number
  matches: number
}

type NotificationContextType = {
  notifications: Notification[]
  counts: NotificationCounts
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  markResourceAsRead: (resourceLink: string) => Promise<void>
  addNotification: (notification: Notification) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    messages: 0,
    events: 0,
    likes: 0,
    matches: 0,
  })

  useEffect(() => {
    const userId = user?.id
    if (!userId) return;
    const currentUserId = userId
    let isMounted = true;
    let pollingStopped = false;
    let loading = false;
    let previousIds: Set<string> | null = null
    let lastCheck = 0
    let originalTitle = ''
    let attention: ReturnType<typeof setInterval> | undefined
    function restoreTitle() {
      if (attention === undefined) return
      clearInterval(attention)
      attention = undefined
      document.title = originalTitle
    }
    let interval: NodeJS.Timeout;
    async function loadNotifications() {
      if (loading || pollingStopped) return
      if (document.hidden && Date.now() - lastCheck < 60000) return
      lastCheck = Date.now()
      loading = true
      try {
        const { notifications } = await getNotifications(currentUserId)
        if (!isMounted) return
        const ids = new Set<string>(notifications.map(item => item.id))
        if (document.hidden && previousIds && attention === undefined &&
            notifications.some(item => !item.read && !previousIds?.has(item.id))) {
          originalTitle = document.title
          document.title = 'Nouvelle notification'
          attention = setInterval(() => {
            document.title = document.title === originalTitle ? 'Nouvelle notification' : originalTitle
          }, 2500)
        }
        previousIds = ids
        setNotifications(notifications)
      } catch (error) {
        if (isMounted) pollingStopped = recoverFromStaleServerAction(error)
      } finally {
        loading = false
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState !== "hidden") {
        restoreTitle()
        void loadNotifications()
      }
    }
    loadNotifications()
    interval = setInterval(loadNotifications, 15000)
    window.addEventListener("focus", loadNotifications)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      isMounted = false;
      restoreTitle()
      window.removeEventListener("focus", loadNotifications)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [user?.id])

  // Mettre à jour les compteurs chaque fois que les notifications changent
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.read)

    setCounts({
      total: unreadNotifications.length,
      messages: unreadNotifications.filter((n) => n.type === "message" || n.type === "new_message").length,
      events: unreadNotifications.filter((n) => n.type === "event").length,
      likes: unreadNotifications.filter((n) => n.type === "like").length,
      matches: unreadNotifications.filter((n) => n.type === "match" || n.type.startsWith("match_")).length,
    })
  }, [notifications])

  const markAsRead = async (id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id)
      if (!notification || notification.read) {
        return prev
      }
      return prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification))
    })
    try {
      await markNotificationAsRead(id)
      if (user?.id) {
        const { notifications } = await getNotifications(user.id)
        setNotifications(notifications)
      }
    } catch (e) {
      recoverFromStaleServerAction(e)
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    if (user?.id) {
      try {
        await markAllNotificationsAsRead(user.id)
        const { notifications } = await getNotifications(user.id)
        setNotifications(notifications)
      } catch (e) {
        recoverFromStaleServerAction(e)
      }
    }
  }

  const markResourceAsRead = useCallback(async (resourceLink: string) => {
    if (!user?.id) return

    setNotifications((prev) => prev.map((notification) => (
      notification.link === resourceLink ? { ...notification, read: true } : notification
    )))

    try {
      await markResourceNotificationsAsRead(user.id, resourceLink)
    } catch (error) {
      recoverFromStaleServerAction(error)
      try {
        const { notifications } = await getNotifications(user.id)
        setNotifications(notifications)
      } catch (refreshError) {
        recoverFromStaleServerAction(refreshError)
      }
    }
  }, [user?.id])

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev])
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        counts,
        markAsRead,
        markAllAsRead,
        markResourceAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
