'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/protected-route'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import { useAuth } from '@/contexts/auth-context'
import {
  getAllMessages,
  deleteMessage,
  banUser,
  searchMessagesByKeywords,
  type ModerationMessage
} from '@/actions/message-actions'

export default function AdminMessagesPage () {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ModerationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMessages, setTotalMessages] = useState(0)
  const messagesPerPage = 50

  const [keywordInput, setKeywordInput] = useState('')
  const [keywordSearchLoading, setKeywordSearchLoading] = useState(false)
  const [keywordSearchResults, setKeywordSearchResults] = useState<ModerationMessage[] | null>(null)
  const [keywordSearchTotal, setKeywordSearchTotal] = useState(0)
  const [keywordSearchPage, setKeywordSearchPage] = useState(1)

  useEffect(() => {
    async function fetchMessages () {
      if (!user?.id) return
      setLoading(true)
      setError(null)
      try {
        const result = await getAllMessages({
          page: currentPage,
          limit: messagesPerPage
        })
        setMessages(result.messages)
        setTotalMessages(result.total)
      } catch (err) {
        console.error('Error fetching messages:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors de la récupération des messages.'
        )
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [user?.id, currentPage])

  const handleDeleteMessage = async (messageId: string) => {
    if (
      !window.confirm(
        'Êtes vous sur de vouloir supprimer ce message, cette action est irréversible ?'
      )
    )
      return
    try {
      await deleteMessage(messageId)
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content:
                  'Le contenu de ce message a été supprimé par le modérateur',
                updated_at: new Date()
              }
            : msg
        )
      )
      alert('Message supprimé.')
    } catch (err) {
      console.error('Error deleting message:', err)
      alert('Erreur lors de la suppression du message.')
    }
  }

  const handleBanUser = async (userId: string, userName: string) => {
    if (
      !window.confirm(
        `Êtes vous sur de vouloir bannir cet utilisateur ${userName} (${userId}) ?`
      )
    )
      return
    try {
      await banUser(userId)
      alert(`Utilisateur ${userName} (${userId}) banni.`)
    } catch (err) {
      console.error('Error banning user:', err)
      alert("Erreur lors du bannissement de l'utilisateur.")
    }
  }

  // Handler pour la recherche par mots-clés
  const handleKeywordSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const keywords = keywordInput
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    if (keywords.length === 0) return
    setKeywordSearchLoading(true)
    try {
      const result = await searchMessagesByKeywords({
        keywords,
        page: keywordSearchPage,
        limit: messagesPerPage
      })
      setKeywordSearchResults(result.messages)
      setKeywordSearchTotal(result.total)
    } catch (err) {
      alert('Erreur lors de la recherche par mots-clés')
    } finally {
      setKeywordSearchLoading(false)
    }
  }

  const totalPages = Math.ceil(totalMessages / messagesPerPage)

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout user={user}>
          <div className='container py-10'>
            <AdminHeader user={user} />
            <AdminTabs />
            <div>Chargement des messages...</div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout user={user}>
          <div className='container py-10'>
            <AdminHeader user={user} />
            <AdminTabs />
            <div className='text-red-500'>{error}</div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-10'>
          <AdminHeader user={user} />
          <AdminTabs />
          <Card>
            <CardHeader>
              <CardTitle>
                Modération des Messages ({totalMessages} au total)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Champ de recherche par mots-clés */}
              <form onSubmit={handleKeywordSearch} className='mb-6 flex gap-2'>
                <input
                  type='text'
                  placeholder='Mots-clés séparés par des virgules'
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  className='border rounded px-3 py-2 flex-1'
                />
                <Button type='submit' disabled={keywordSearchLoading || !keywordInput.trim()}>
                  {keywordSearchLoading ? 'Recherche...' : 'Rechercher'}
                </Button>
              </form>
              {/* Résultats de recherche par mots-clés */}
              {keywordSearchResults && (
                <div className='mb-8'>
                  <h3 className='font-bold mb-2'>Résultats pour : {keywordInput}</h3>
                  {keywordSearchResults.length === 0 ? (
                    <p>Aucun message trouvé pour ces mots-clés.</p>
                  ) : (
                    <div className='space-y-4'>
                      {keywordSearchResults.map(message => (
                        <div key={message.id} className='border p-4 rounded-md shadow-sm'>
                          <div className='flex justify-between items-start mb-2'>
                            <div>
                              <p className='font-semibold text-lg'>
                                Conversation ID:{' '}
                                <span className='font-normal text-gray-700'>
                                  {message.conversation_id}
                                </span>
                              </p>
                              <p className='text-sm'>
                                <span className='font-medium'>Protagonistes:</span>{' '}
                                {message.protagonists
                                  .map(
                                    p =>
                                      `${
                                        p.name || 'Utilisateur Anonyme'
                                      } (${p.user_id.substring(0, 8)}...)`
                                  )
                                  .join(', ') || 'N/A'}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                <span className='font-medium'>Envoyé par:</span>{' '}
                                {message.sender_name || 'Utilisateur Anonyme'} (
                                {message.sender_id.substring(0, 8)}...)
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                <span className='font-medium'>Le:</span>{' '}
                                {new Date(message.created_at).toLocaleString(
                                  'fr-FR'
                                )}
                              </p>
                              {message.updated_at &&
                                new Date(message.updated_at).getTime() !==
                                  new Date(message.created_at).getTime() && (
                                  <p className='text-xs text-amber-600'>
                                    <span className='font-medium'>Modifié le:</span>{' '}
                                    {new Date(message.updated_at).toLocaleString(
                                      'fr-FR'
                                    )}
                                  </p>
                                )}
                            </div>
                            <div className='flex flex-col space-y-2 items-end'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleDeleteMessage(message.id)}
                                className='hover:bg-red-100 hover:text-red-700'
                              >
                                Supprimer Message
                              </Button>
                              <div className='flex space-x-2'>
                                {message.protagonists.map(p => (
                                  <Button
                                    key={p.user_id}
                                    variant='destructive'
                                    size='sm'
                                    onClick={() =>
                                      handleBanUser(
                                        p.user_id,
                                        p.name || 'Utilisateur Anonyme'
                                      )
                                    }
                                  >
                                    Bannir {p.name || 'Utilisateur Anonyme'}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p
                            className={`text-sm p-3 rounded mt-2 whitespace-pre-wrap bg-[#170321]  ${
                              message.content ===
                              'Le contenu de ce message a été supprimé par le modérateur'
                                ? 'italic text-red-500'
                                : 'text-white'
                            }`}
                          >
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Pagination pour la recherche par mots-clés */}
                  {Math.ceil(keywordSearchTotal / messagesPerPage) > 1 && (
                    <div className='mt-4 flex justify-center items-center space-x-2'>
                      <Button
                        onClick={() => {
                          setKeywordSearchPage(p => Math.max(1, p - 1))
                          handleKeywordSearch()
                        }}
                        disabled={keywordSearchPage === 1}
                        variant='outline'
                      >
                        Précédent
                      </Button>
                      <span>
                        Page {keywordSearchPage} sur {Math.ceil(keywordSearchTotal / messagesPerPage)}
                      </span>
                      <Button
                        onClick={() => {
                          setKeywordSearchPage(p => Math.min(Math.ceil(keywordSearchTotal / messagesPerPage), p + 1))
                          handleKeywordSearch()
                        }}
                        disabled={keywordSearchPage === Math.ceil(keywordSearchTotal / messagesPerPage)}
                        variant='outline'
                      >
                        Suivant
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {messages.length === 0 && !loading ? (
                <p>Aucun message à afficher.</p>
              ) : (
                <div className='space-y-4'>
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className='border p-4 rounded-md shadow-sm'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <p className='font-semibold text-lg'>
                            Conversation ID:{' '}
                            <span className='font-normal text-gray-700'>
                              {message.conversation_id}
                            </span>
                          </p>
                          <p className='text-sm'>
                            <span className='font-medium'>Protagonistes:</span>{' '}
                            {message.protagonists
                              .map(
                                p =>
                                  `${
                                    p.name || 'Utilisateur Anonyme'
                                  } (${p.user_id.substring(0, 8)}...)`
                              )
                              .join(', ') || 'N/A'}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            <span className='font-medium'>Envoyé par:</span>{' '}
                            {message.sender_name || 'Utilisateur Anonyme'} (
                            {message.sender_id.substring(0, 8)}...)
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            <span className='font-medium'>Le:</span>{' '}
                            {new Date(message.created_at).toLocaleString(
                              'fr-FR'
                            )}
                          </p>
                          {message.updated_at &&
                            new Date(message.updated_at).getTime() !==
                              new Date(message.created_at).getTime() && (
                              <p className='text-xs text-amber-600'>
                                <span className='font-medium'>Modifié le:</span>{' '}
                                {new Date(message.updated_at).toLocaleString(
                                  'fr-FR'
                                )}
                              </p>
                            )}
                        </div>
                        <div className='flex flex-col space-y-2 items-end'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDeleteMessage(message.id)}
                            className='hover:bg-red-100 hover:text-red-700'
                          >
                            Supprimer Message
                          </Button>
                          <div className='flex space-x-2'>
                            {message.protagonists.map(p => (
                              <Button
                                key={p.user_id}
                                variant='destructive'
                                size='sm'
                                onClick={() =>
                                  handleBanUser(
                                    p.user_id,
                                    p.name || 'Utilisateur Anonyme'
                                  )
                                }
                              >
                                Bannir {p.name || 'Utilisateur Anonyme'}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p
                        className={`text-sm p-3 rounded mt-2 whitespace-pre-wrap bg-[#170321]  ${
                          message.content ===
                          'Le contenu de ce message a été supprimé par le modérateur'
                            ? 'italic text-red-500'
                            : 'text-white'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className='mt-6 flex justify-center items-center space-x-2'>
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant='outline'
                  >
                    Précédent
                  </Button>
                  <span>
                    Page {currentPage} sur {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage(p => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    variant='outline'
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
