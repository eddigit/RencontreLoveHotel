"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X } from "lucide-react"
import Image from "next/image"
import type { Notification } from "@/components/notifications-dropdown"

interface ToastNotificationProps {
  notification: Notification
  onClose: () => void
  autoClose?: boolean
  autoCloseTime?: number
}

export function ToastNotification({
  notification,
  onClose,
  autoClose = true,
  autoCloseTime = 5000,
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, autoCloseTime)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseTime])

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onClose()
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case "message":
        return <Bell className="h-5 w-5 text-primary" />
      case "like":
        return <Bell className="h-5 w-5 text-secondary" />
      case "event":
        return <Bell className="h-5 w-5 text-primary" />
      default:
        return <Bell className="h-5 w-5 text-primary" />
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -50, x: "-50%" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full"
        >
          <div className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3">
            <div className="relative flex-shrink-0">
              {notification.image ? (
                <Image
                  src={notification.image || "/placeholder.svg"}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-graphite flex items-center justify-center">{getIcon()}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm">{notification.title}</h3>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{notification.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
