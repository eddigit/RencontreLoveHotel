import { revalidatePath } from 'next/cache'
import MainLayout from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getActivityEmailPreference,
  getCampaignEmailPreference,
  updateCampaignEmailPreference
} from '@/actions/email-preference-actions'
import { requireCurrentUser } from '@/lib/server-auth'
import { ActivityEmailPreferencesForm } from '@/components/activity-email-preferences-form'

export default async function EmailPreferencesPage() {
  const user = await requireCurrentUser()
  const [preference, activityPreference] = await Promise.all([
    getCampaignEmailPreference(),
    getActivityEmailPreference()
  ])

  async function updatePreference(formData: FormData) {
    'use server'
    await updateCampaignEmailPreference(formData.get('choice') === 'on')
    revalidatePath('/email-preferences')
  }

  return (
    <MainLayout user={user}>
      <main className='mx-auto w-full max-w-2xl space-y-5 px-4 py-10'>
        <Card>
          <CardHeader>
            <CardTitle>Activité du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityEmailPreferencesForm initialPreference={activityPreference} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actualités de la communauté</CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
            <p className='text-sm text-muted-foreground'>
              Les emails de communauté et d’événements sont actuellement{' '}
              <strong className='text-foreground'>
                {preference.campaign_opt_in ? 'activés' : 'désactivés'}
              </strong>.
            </p>
            <form action={updatePreference} className='flex flex-col gap-3 sm:flex-row'>
              <Button type='submit' name='choice' value='on'>
                Recevoir les actualités
              </Button>
              <Button type='submit' name='choice' value='off' variant='outline'>
                Ne plus recevoir ces emails
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  )
}
