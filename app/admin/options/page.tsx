'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  MessageSquareText,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Waves
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOption, setOption } from '@/actions/user-actions'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import { useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

const defaultVerificationSubject = 'Vérifiez votre adresse email sur Love Hotel'
const defaultVerificationBody = `Bonjour [name],

Merci de vous être inscrit sur Love Hotel !

Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :

[verification-link]

Si vous n'avez pas créé de compte, ignorez cet email.

L'équipe Love Hotel`

const defaultResetSubject = 'Réinitialisez votre mot de passe sur Love Hotel'
const defaultResetBody = `Bonjour [name],

Vous avez demandé à réinitialiser votre mot de passe.

Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe :

[reset-link]

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

L'équipe Love Hotel`

type EventCategory = {
  value: string
  label: string
}

function normalizeEventCategoriesOption(value?: string | null) {
  const normalized = (value || activeEventCategoriesFallback)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => activeEventCategoryValues.has(line.split('|')[0]?.trim()))
    .join('\n')

  return normalized || activeEventCategoriesFallback
}

function parseEventCategories(value: string): EventCategory[] {
  return normalizeEventCategoriesOption(value)
    .split('\n')
    .map(line => {
      const [rawValue, ...labelParts] = line.split('|')
      return {
        value: rawValue.trim(),
        label: labelParts.join('|').trim()
      }
    })
    .filter(category => category.value && category.label)
}

function StatCard({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string
  tone?: 'default' | 'pink' | 'green' | 'amber'
}) {
  const toneClass = {
    default: 'border-white/10 bg-white/[0.05] text-white',
    pink: 'border-[#ff4fa3]/30 bg-[#ff4fa3]/10 text-[#ffd5ea]',
    green: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    amber: 'border-amber-300/25 bg-amber-300/10 text-amber-100'
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className='text-xs font-bold uppercase tracking-wide text-white/55'>
        {label}
      </p>
      <p className='mt-2 text-2xl font-black'>{value}</p>
    </div>
  )
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
      <div className='flex gap-3'>
        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-[#ff7ac0]'>
          {icon}
        </div>
        <div>
          <p className='text-xs font-black uppercase tracking-[0.18em] text-[#ff7ac0]'>
            {eyebrow}
          </p>
          <h2 className='mt-1 text-2xl font-black text-white'>{title}</h2>
          <p className='mt-2 max-w-3xl text-sm leading-6 text-white/65'>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({
  title,
  hint
}: {
  title: string
  hint?: string
}) {
  return (
    <label className='space-y-2'>
      <span className='block text-sm font-black text-white'>{title}</span>
      {hint ? <span className='block text-xs text-white/55'>{hint}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[#ff4fa3] focus:ring-2 focus:ring-[#ff4fa3]/25'

export default function AdminOptionsPage () {
  const { user } = useAuth()
  const [eventCategories, setEventCategories] = useState(activeEventCategoriesFallback)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [emailSubject, setEmailSubject] = useState(defaultVerificationSubject)
  const [emailBody, setEmailBody] = useState(defaultVerificationBody)
  const [resetEmailSubject, setResetEmailSubject] = useState(defaultResetSubject)
  const [resetEmailBody, setResetEmailBody] = useState(defaultResetBody)

  const eventCategoryList = useMemo(
    () => parseEventCategories(eventCategories),
    [eventCategories]
  )
  const resetHasRequiredPlaceholders = resetEmailBody.includes('[reset-link]')
  const verificationHasRequiredPlaceholders =
    emailBody.includes('[verification-link]')

  useEffect(() => {
    async function fetchOptions () {
      setLoading(true)
      setError('')
      try {
        const [
          categoriesValue,
          verificationSubject,
          verificationBody,
          resetSubject,
          resetBody
        ] = await Promise.all([
          getOption('event_categories'),
          getOption('verification_email_subject'),
          getOption('verification_email_body'),
          getOption('password_reset_email_subject'),
          getOption('password_reset_email_body')
        ])

        setEventCategories(normalizeEventCategoriesOption(categoriesValue))
        setEmailSubject(verificationSubject || defaultVerificationSubject)
        setEmailBody(verificationBody || defaultVerificationBody)
        setResetEmailSubject(resetSubject || defaultResetSubject)
        setResetEmailBody(resetBody || defaultResetBody)
      } catch (err) {
        setError("Impossible de charger les paramètres pour le moment.")
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      await Promise.all([
        setOption('event_categories', normalizeEventCategoriesOption(eventCategories)),
        setOption('verification_email_subject', emailSubject.trim()),
        setOption('verification_email_body', emailBody.trim()),
        setOption('password_reset_email_subject', resetEmailSubject.trim()),
        setOption('password_reset_email_body', resetEmailBody.trim())
      ])
      setEventCategories(normalizeEventCategoriesOption(eventCategories))
      setSuccess(true)
    } catch (err) {
      setError("Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='mx-auto w-full max-w-[1680px] px-4 py-8 sm:px-6 lg:px-8'>
          <AdminHeader user={user} />
          <AdminTabs />

          <div className='mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#16001e]/85 text-white shadow-2xl'>
            <div className='border-b border-white/10 bg-gradient-to-r from-[#3d064c] via-[#24002f] to-[#120018] p-6 lg:p-8'>
              <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
                <div>
                  <div className='inline-flex items-center gap-2 rounded-full border border-[#ff4fa3]/35 bg-[#ff4fa3]/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffd5ea]'>
                    <Settings2 className='h-4 w-4' />
                    Console de configuration
                  </div>
                  <h1 className='mt-5 text-3xl font-black tracking-tight md:text-5xl'>
                    Paramètres de l'application
                  </h1>
                  <p className='mt-4 max-w-4xl text-sm leading-6 text-white/70 md:text-base'>
                    Pilotage des formats d'événements, des emails
                    transactionnels et des modules sensibles. Cette page garde
                    les clés de configuration existantes, mais les expose dans
                    une interface plus lisible et plus scalable.
                  </p>
                </div>

                <div className='grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[520px]'>
                  <StatCard
                    label='Événements actifs'
                    value={String(eventCategoryList.length)}
                    tone='pink'
                  />
                  <StatCard label='Emails actifs' value='1' tone='green' />
                  <StatCard label='Offres publiques' value='Standby' tone='amber' />
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className='space-y-8 p-5 lg:p-8'>
              {loading ? (
                <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65'>
                  Chargement des paramètres...
                </div>
              ) : null}

              <section className='rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:p-6'>
                <SectionHeader
                  icon={<Waves className='h-5 w-5' />}
                  eyebrow='Expériences'
                  title='Événements activés'
                  description='Seuls les formats réellement exploitables aujourd’hui restent actifs : apéro jacuzzi et rideaux ouverts. Restaurant et bar restent en standby.'
                />

                <div className='grid gap-4 lg:grid-cols-[1fr_1.2fr]'>
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-1'>
                    {eventCategoryList.map(category => (
                      <div
                        key={category.value}
                        className='rounded-2xl border border-[#ff4fa3]/25 bg-[#ff4fa3]/10 p-4'
                      >
                        <div className='flex items-center justify-between gap-3'>
                          <p className='font-black text-white'>{category.label}</p>
                          <CheckCircle2 className='h-5 w-5 text-emerald-300' />
                        </div>
                        <p className='mt-2 font-mono text-xs text-white/50'>
                          {category.value}
                        </p>
                      </div>
                    ))}
                    <div className='rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100'>
                      <div className='flex items-start gap-3'>
                        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0' />
                        <p>
                          Restaurant et bar restent en standby : ne pas les
                          remettre dans les catégories publiques tant que les
                          prestations ne sont pas à nouveau disponibles.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel
                      title='Configuration technique des catégories'
                      hint='Une paire valeur|label par ligne. Toute catégorie non autorisée est automatiquement supprimée à la sauvegarde.'
                    />
                    <textarea
                      className={`${inputClass} mt-2 min-h-[180px] font-mono text-sm`}
                      value={eventCategories}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEventCategories(e.target.value)
                      }
                      placeholder={activeEventCategoriesFallback}
                    />
                    <div className='mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2'>
                      <code className='rounded-xl bg-black/25 px-3 py-2'>
                        jacuzzi|Apéro jacuzzi 2 à 4 couples
                      </code>
                      <code className='rounded-xl bg-black/25 px-3 py-2'>
                        open_curtains|Rideaux ouverts 2 ou 3 chambres
                      </code>
                    </div>
                  </div>
                </div>
              </section>

              <section className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
                <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:p-6'>
                  <SectionHeader
                    icon={<Mail className='h-5 w-5' />}
                    eyebrow='Communication'
                    title='Emails transactionnels'
                    description='Les campagnes marketing restent séparées du module Emails. Ici, on ne pilote que les modèles techniques : réinitialisation explicite et ancien modèle de vérification gardé en veille.'
                  />

                  <div className='space-y-5'>
                    <div className='rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4'>
                      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                        <div>
                          <p className='font-black text-white'>
                            Mot de passe oublié
                          </p>
                          <p className='mt-1 text-sm text-white/60'>
                            Envoi autorisé uniquement après demande explicite du
                            membre.
                          </p>
                        </div>
                        <span className='rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-black text-emerald-100'>
                          Actif
                        </span>
                      </div>
                      <div className='mt-4 grid gap-4'>
                        <input
                          className={inputClass}
                          value={resetEmailSubject}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setResetEmailSubject(e.target.value)
                          }
                          placeholder={defaultResetSubject}
                        />
                        <textarea
                          className={`${inputClass} min-h-[180px] font-mono text-sm`}
                          value={resetEmailBody}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setResetEmailBody(e.target.value)
                          }
                          placeholder={defaultResetBody}
                        />
                        <p
                          className={`text-xs font-bold ${
                            resetHasRequiredPlaceholders
                              ? 'text-emerald-200'
                              : 'text-amber-200'
                          }`}
                        >
                          Placeholder requis : [reset-link]
                        </p>
                      </div>
                    </div>

                    <div className='rounded-2xl border border-white/10 bg-white/[0.035] p-4'>
                      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                        <div>
                          <p className='font-black text-white'>
                            Vérification email
                          </p>
                          <p className='mt-1 text-sm text-white/60'>
                            Modèle conservé, mais les envois automatiques sont
                            désactivés selon la règle opérationnelle actuelle.
                          </p>
                        </div>
                        <span className='rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70'>
                          En veille
                        </span>
                      </div>
                      <div className='mt-4 grid gap-4'>
                        <input
                          className={inputClass}
                          value={emailSubject}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEmailSubject(e.target.value)
                          }
                          placeholder={defaultVerificationSubject}
                        />
                        <textarea
                          className={`${inputClass} min-h-[150px] font-mono text-sm`}
                          value={emailBody}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEmailBody(e.target.value)
                          }
                          placeholder={defaultVerificationBody}
                        />
                        <p
                          className={`text-xs font-bold ${
                            verificationHasRequiredPlaceholders
                              ? 'text-white/55'
                              : 'text-amber-200'
                          }`}
                        >
                          Placeholder conservé : [verification-link]
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='space-y-6'>
                  <section className='rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:p-6'>
                    <SectionHeader
                      icon={<Sparkles className='h-5 w-5' />}
                      eyebrow='Offre'
                      title='Conciergerie & premium'
                      description='Suivi des modules sensibles sans activer d’offre commerciale non finalisée.'
                    />
                    <div className='space-y-3'>
                      <div className='rounded-2xl border border-[#ff4fa3]/25 bg-[#ff4fa3]/10 p-4'>
                        <p className='font-black text-white'>
                          Conciergerie érotique
                        </p>
                        <p className='mt-2 text-sm leading-6 text-white/65'>
                          Demandes privées routées vers l’admin, email
                          opérationnel et chat si le membre le souhaite.
                        </p>
                      </div>
                      <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-4'>
                        <p className='font-black text-white'>Premium</p>
                        <p className='mt-2 text-sm leading-6 text-white/65'>
                          Amorce visible, monétisation et live vidéo à deviser
                          séparément avant activation.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className='rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:p-6'>
                    <SectionHeader
                      icon={<ShieldCheck className='h-5 w-5' />}
                      eyebrow='Contrôle'
                      title='Sécurité & maintenance'
                      description='Points sensibles à contrôler avant chaque mise en production.'
                    />
                    <div className='space-y-3 text-sm text-white/70'>
                      <div className='flex gap-3 rounded-2xl bg-white/[0.04] p-4'>
                        <Lock className='mt-0.5 h-5 w-5 shrink-0 text-emerald-300' />
                        <p>
                          Google et identifiants classiques doivent rester
                          disponibles après les mises à jour.
                        </p>
                      </div>
                      <div className='flex gap-3 rounded-2xl bg-white/[0.04] p-4'>
                        <MessageSquareText className='mt-0.5 h-5 w-5 shrink-0 text-[#ff7ac0]' />
                        <p>
                          Messagerie autorisée après match accepté ou dans une
                          conversation admin.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <section className='rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:p-6'>
                <SectionHeader
                  icon={<CheckCircle2 className='h-5 w-5' />}
                  eyebrow='Validation'
                  title='Aperçu de livraison'
                  description='Résumé des réglages qui seront enregistrés et utilisés par les écrans publics.'
                />
                <div className='grid gap-4 md:grid-cols-3'>
                  <StatCard
                    label='Formats événement'
                    value={eventCategoryList.map(item => item.label).join(' + ')}
                    tone='pink'
                  />
                  <StatCard
                    label='Reset email'
                    value={resetHasRequiredPlaceholders ? 'OK' : 'À corriger'}
                    tone={resetHasRequiredPlaceholders ? 'green' : 'amber'}
                  />
                  <StatCard
                    label='Vérification'
                    value='En veille'
                    tone='default'
                  />
                </div>
              </section>

              {error ? (
                <div className='rounded-2xl border border-red-400/30 bg-red-950/40 p-4 text-sm font-bold text-red-100'>
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className='rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100'>
                  Configuration enregistrée.
                </div>
              ) : null}

              <div className='sticky bottom-4 z-20 flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#17001e]/95 p-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between'>
                <p className='text-sm text-white/65'>
                  Les catégories sont filtrées à la sauvegarde pour éviter de
                  réactiver une offre indisponible.
                </p>
                <Button
                  type='submit'
                  disabled={saving || loading}
                  className='rounded-2xl bg-[#ff3b8b] px-6 py-3 font-black text-white hover:bg-[#ff4fa3]'
                >
                  <Save className='mr-2 h-4 w-4' />
                  {saving
                    ? 'Enregistrement...'
                    : 'Sauvegarder la configuration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
