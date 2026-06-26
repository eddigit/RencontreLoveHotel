'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Calendar, Heart, MessageCircle, UserPlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { MobileNavigation } from '@/components/mobile-navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'
import { useNotifications } from '@/contexts/notification-context'
import { useAuth } from '@/contexts/auth-context'
import MainLayout from '@/components/layout/main-layout'

export default function NotificationsPage (props: any) {
  const { user: userAuth } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Get tab from URL if present
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['all', 'messages', 'likes', 'events', 'system'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    // Simuler un temps de chargement
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Grouper les notifications par type
  const messageNotifications = notifications.filter(n => n.type === 'message')
  const likeNotifications = notifications.filter(n => n.type === 'like')
  const eventNotifications = notifications.filter(n => n.type === 'event')
  const systemNotifications = notifications.filter(
    n => n.type === 'system' || n.type === 'match'
  )

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center'>
        <motion.div
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear'
          }}
          className='w-12 h-12 border-4 border-primary border-t-transparent rounded-full'
        />
        <p className='mt-4 text-muted-foreground'>
          Chargement des notifications...
        </p>
      </div>
    )
  }

  return (
    <MainLayout user={userAuth}>
      <div className='min-h-screen flex flex-col pb-16 md:pb-0'>
        <div className='container py-4 md:py-6 flex-1'>
          <div className='flex justify-between items-center mb-4'>
            <h1 className='text-2xl md:text-3xl font-bold'>Notifications</h1>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className='px-3 py-1 rounded bg-primary text-white text-xs hover:bg-primary/80 transition-colors'
                type='button'
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-5 mb-4 md:mb-6 overflow-x-auto'>
              <TabsTrigger value='all' className='text-xs sm:text-sm'>
                Toutes
              </TabsTrigger>
              <TabsTrigger value='messages' className='text-xs sm:text-sm'>
                Messages
              </TabsTrigger>
              <TabsTrigger value='likes' className='text-xs sm:text-sm'>
                J&apos;aime
              </TabsTrigger>
              <TabsTrigger value='events' className='text-xs sm:text-sm'>
                Événements
              </TabsTrigger>
              <TabsTrigger value='system' className='text-xs sm:text-sm'>
                Système
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode='wait'>
              <TabsContent
                key={activeTab}
                value='all'
                className='space-y-3 md:space-y-4'
              >
                <motion.div
                  variants={container}
                  initial='hidden'
                  animate='show'
                  className='space-y-3 md:space-y-4'
                >
                  {notifications.map(notification => (
                    <motion.div key={notification.id} variants={item}>
                      <NotificationCard
                        notification={notification}
                        onMarkAsRead={markAsRead}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>

              <TabsContent
                key={`${activeTab}-messages`}
                value='messages'
                className='space-y-3 md:space-y-4'
              >
                <motion.div
                  variants={container}
                  initial='hidden'
                  animate='show'
                  className='space-y-3 md:space-y-4'
                >
                  {messageNotifications.length > 0 ? (
                    messageNotifications.map(notification => (
                      <motion.div key={notification.id} variants={item}>
                        <NotificationCard
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState message='Aucun message' />
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent
                key={`${activeTab}-likes`}
                value='likes'
                className='space-y-3 md:space-y-4'
              >
                <motion.div
                  variants={container}
                  initial='hidden'
                  animate='show'
                  className='space-y-3 md:space-y-4'
                >
                  {likeNotifications.length > 0 ? (
                    likeNotifications.map(notification => (
                      <motion.div key={notification.id} variants={item}>
                        <NotificationCard
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState message="Aucun j'aime" />
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent
                key={`${activeTab}-events`}
                value='events'
                className='space-y-3 md:space-y-4'
              >
                <motion.div
                  variants={container}
                  initial='hidden'
                  animate='show'
                  className='space-y-3 md:space-y-4'
                >
                  {eventNotifications.length > 0 ? (
                    eventNotifications.map(notification => (
                      <motion.div key={notification.id} variants={item}>
                        <NotificationCard
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState message='Aucun événement' />
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent
                key={`${activeTab}-system`}
                value='system'
                className='space-y-3 md:space-y-4'
              >
                <motion.div
                  variants={container}
                  initial='hidden'
                  animate='show'
                  className='space-y-3 md:space-y-4'
                >
                  {systemNotifications.length > 0 ? (
                    systemNotifications.map(notification => (
                      <motion.div key={notification.id} variants={item}>
                        <NotificationCard
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState message='Aucune notification système' />
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        <MobileNavigation />
      </div>
    </MainLayout>
  )
}

function NotificationCard ({
  notification,
  onMarkAsRead
}: {
  notification: any
  onMarkAsRead?: (id: string) => void
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return <MessageCircle className='h-5 w-5 text-primary' />
      case 'like':
        return <Heart className='h-5 w-5 text-secondary' />
      case 'event':
        return <Calendar className='h-5 w-5 text-primary' />
      case 'match':
        return <UserPlus className='h-5 w-5 text-secondary' />
      default:
        return <Bell className='h-5 w-5 text-primary' />
    }
  }

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <Link href={notification.link || '#'} onClick={handleClick}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Card
          className={`hover:bg-muted/50 transition-colors ${
            !notification.read ? 'border-l-4 border-l-primary' : ''
          }`}
        >
          <CardContent className='p-3 md:p-4 flex items-start gap-3 md:gap-4'>
            <div className='relative flex-shrink-0'>
              {notification.image ? (
                <Image
                  src={notification.image || '/placeholder.svg'}
                  alt=''
                  width={48}
                  height={48}
                  className='rounded-full object-cover'
                />
              ) : (
                <div className='h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center'>
                  {getIcon()}
                </div>
              )}
              <AnimatePresence>
                {!notification.read && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className='absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-primary'
                  />
                )}
              </AnimatePresence>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between'>
                <h3 className='font-semibold text-sm md:text-base line-clamp-1'>
                  {notification.title}
                </h3>
                <span className='text-xs text-muted-foreground ml-2 flex-shrink-0'>
                  {notification.time}
                </span>
              </div>
              <p className='text-xs md:text-sm text-muted-foreground line-clamp-2'>
                {notification.description}
              </p>
              <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                {(notification.priority === 'high' ||
                  notification.priority === 'critical') && (
                  <span className='rounded-full bg-[#ff3b8b]/15 px-2 py-1 text-[#ff7db8]'>
                    {notification.priority}
                  </span>
                )}
                {notification.audience === 'admin' && (
                  <span className='rounded-full bg-white/10 px-2 py-1 text-muted-foreground'>
                    admin
                  </span>
                )}
                {notification.category && (
                  <span className='rounded-full bg-white/10 px-2 py-1 text-muted-foreground'>
                    {notification.category}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}

function EmptyState ({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className='flex flex-col items-center justify-center py-8 md:py-12 text-center'
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.3 }}
        className='h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4'
      >
        <Bell className='h-8 w-8 text-muted-foreground' />
      </motion.div>
      <h3 className='font-semibold text-lg'>{message}</h3>
      <p className='text-muted-foreground mt-1'>
        Vous n&apos;avez aucune notification de ce type
      </p>
    </motion.div>
  )
}
