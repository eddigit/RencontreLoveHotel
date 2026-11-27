"use client"

import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface NotificationBadgeProps {
  count: number
  variant?: "primary" | "secondary" | "default"
  size?: "sm" | "md"
}

export function NotificationBadge({ count, variant = "primary", size = "sm" }: NotificationBadgeProps) {
  if (count <= 0) return null

  const badgeVariant =
    variant === "primary"
      ? "bg-[#d6bc87] text-[#191714] border-0"
      : variant === "secondary"
        ? "bg-[#302c24] text-[#e5d1aa] border-0"
        : "bg-destructive text-destructive-foreground"

  const badgeSize = size === "sm" ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute -top-1 -right-1"
      >
        <Badge
          className={`${badgeVariant} ${badgeSize} flex items-center justify-center p-0 rounded-full shadow-lg shadow-black/20`}
        >
          {count > 9 ? "9+" : count}
        </Badge>
      </motion.div>
    </AnimatePresence>
  )
}
