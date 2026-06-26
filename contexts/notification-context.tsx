"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions"
import { useAuth } from "@/contexts/auth-context"
import type { Notification } from "@/components/notifications-dropdown"

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
    let interval: NodeJS.Timeout;
    async function loadNotifications() {
      try {
        const { notifications } = await getNotifications(currentUserId)
        if (isMounted) setNotifications(notifications)
      } catch (error) {
        if (isMounted) console.error("Failed to load notifications:", error)
      }
    }
    loadNotifications()
    interval = setInterval(loadNotifications, 15000) // Poll every 15 seconds
    return () => {
      isMounted = false;
      clearInterval(interval)
    }
  }, [user?.id])

  // Mettre à jour les compteurs chaque fois que les notifications changent
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.read)

    setCounts({
      total: unreadNotifications.length,
      messages: unreadNotifications.filter((n) => n.type === "message").length,
      events: unreadNotifications.filter((n) => n.type === "event").length,
      likes: unreadNotifications.filter((n) => n.type === "like").length,
      matches: unreadNotifications.filter((n) => n.type === "match").length,
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
    } catch (e) {
      // Optionally handle error
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    if (user?.id) {
      try {
        await markAllNotificationsAsRead(user.id)
      } catch (e) {
        // Optionally handle error
      }
    }
  }

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
