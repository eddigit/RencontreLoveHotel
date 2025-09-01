'use client'

import type React from 'react'
import { use } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageIcon, Mic, Send, ArrowLeft } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  getConversationMessages,
  sendMessage,
  getUserConversations
} from '@/actions/conversation-actions'
import { useSession } from 'next-auth/react'

// Define types for better type safety
interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
  sender_avatar?: string
}

interface ConversationDetails {
  id: string
  other_user_name: string
  other_user_avatar: string | null
}

export default function ConversationPage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    async function fetchData () {
      if (session?.user?.id && id) {
        setLoading(true)
        try {
          const fetchedMessages = await getConversationMessages(id, session.user.id)
          setMessages(fetchedMessages as Message[])

          const userConversations = await getUserConversations(session.user.id)
          const currentConv = userConversations.find(conv => conv.id === id)
          if (currentConv) {
            setConversationDetails({
              id: currentConv.id,
              other_user_name: currentConv.other_user_name,
              other_user_avatar: currentConv.other_user_avatar
            })
          } else {
            console.warn('Conversation details not found for ID:', id)
          }
        } catch (error) {
          console.error('Failed to fetch conversation data:', error)
          if (error instanceof Error && error.message.includes('Access denied')) {
            setError('Vous n\'avez pas accès à cette conversation.')
          } else {
            setError('Une erreur est survenue lors du chargement de la conversation.')
          }
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [session, id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && session?.user?.id && id) {
      const optimisticMessage: Message = {
        id: Date.now().toString(),
        sender_id: session.user.id,
        content: message,
        created_at: new Date().toISOString()
      }
      setMessages(prevMessages => [...prevMessages, optimisticMessage])
      const currentMessage = message
      setMessage('')

      try {
        const newMessage = await sendMessage({
          conversationId: id,
          senderId: session.user.id,
          content: currentMessage
        })
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === optimisticMessage.id ? (newMessage as Message) : msg
          )
        )
      } catch (error) {
        console.error('Failed to send message:', error)
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== optimisticMessage.id)
        )
        setMessage(currentMessage)
      }
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <p className='text-white'>Loading conversation...</p>
      </div>
    )
  }

  if (error || !conversationDetails) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <p className='text-white'>{error || 'Conversation not found or access denied.'}</p>
        <Link href='/messages' className='text-pink-400 hover:underline mt-2'>
          Back to messages
        </Link>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
      {/* Header de conversation */}
      <div className='sticky top-0 z-10 bg-[#1a0d2e]/95 backdrop-blur-md border-b border-purple-800/30'>
        <div className='container py-3 flex items-center gap-3'>
          <Link href='/messages'>
            <Button variant='ghost' size='icon' className='rounded-full'>
              <ArrowLeft className='h-5 w-5' />
            </Button>
          </Link>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Image
                src={
                  conversationDetails.other_user_avatar || '/placeholder.svg'
                }
                alt={conversationDetails.other_user_name || 'User'}
                width={40}
                height={40}
                className='rounded-full object-cover'
              />
            </div>
            <div>
              <h2 className='font-semibold'>
                {conversationDetails.other_user_name}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4 max-w-lg'>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_id === session?.user?.id
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 ${
                msg.sender_id === session?.user?.id
                  ? 'bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white rounded-br-none'
                  : 'bg-[#2d1155]/70 backdrop-blur-sm rounded-bl-none'
              }`}
            >
              <div className='mb-1 break-words'>{msg.content}</div>
              <div
                className={`text-xs ${
                  msg.sender_id === session?.user?.id
                    ? 'text-white/70'
                    : 'text-muted-foreground'
                } text-right`}
              >
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className='border-t border-purple-800/30 p-3 md:p-4 sticky bottom-0 bg-[#1a0d2e]/95 backdrop-blur-md'>
        <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='rounded-full flex-shrink-0'
          >
            <ImageIcon className='h-5 w-5' />
          </Button>
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder='Écrivez un message...'
            className='flex-1 rounded-full bg-[#2d1155]/50 border-purple-800/30 focus:border-[#ff3b8b]'
          />
          <Button
            type='submit'
            size='icon'
            className='rounded-full flex-shrink-0 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] border-0 hover:opacity-90'
            disabled={!message.trim() || loading}
          >
            <Send className='h-5 w-5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='rounded-full flex-shrink-0 hidden sm:flex'
          >
            <Mic className='h-5 w-5' />
          </Button>
        </form>
      </div>
    </div>
  )
}
