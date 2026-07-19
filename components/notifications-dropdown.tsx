"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export type Notification = {
  id: string
  type: "message" | "like" | "event" | "match" | "system"
  title: string
  description: string
  time: string
  read: boolean
  priority?: "low" | "normal" | "high" | "critical"
  category?: string | null
  audience?: "user" | "admin"
  metadata?: Record<string, unknown>
  image?: string
  link?: string
}

interface NotificationsDropdownProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
}

export function NotificationsDropdown({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const unreadCount = notifications.filter((n) => !n.read).length
  const urgentCount = notifications.filter(
    (n) => !n.read && (n.priority === "high" || n.priority === "critical")
  ).length

  const handleNotificationClick = (notification: Notification) => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
    }

    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full">
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute -top-1 -right-1"
              >
                <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {urgentCount > 0 ? "!" : unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={onMarkAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <DropdownMenuItem
                    className={cn("flex items-start gap-3 p-3 cursor-pointer", !notification.read && "bg-muted/50")}
                    onClick={() => handleNotificationClick(notification)}
                  >
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
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <AnimatePresence>
                        {!notification.read && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{notification.time}</span>
                        {(notification.priority === "high" || notification.priority === "critical") && (
                          <span className="rounded-full bg-[#ff3b8b]/15 px-2 py-0.5 text-[#ff7db8]">
                            {notification.priority}
                          </span>
                        )}
                        {notification.audience === "admin" && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5">
                            admin
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                <p>Aucune notification</p>
              </div>
            )}
          </AnimatePresence>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/notifications" className="w-full text-center">
            Voir toutes les notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
