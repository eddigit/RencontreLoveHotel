import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall UI integration', () => {
  it('mounts the member-only wall on the connected community home', () => {
    const discoverSource = readFileSync('app/discover/page.tsx', 'utf8')
    const newProfilesIndex = discoverSource.indexOf("id='new-profiles'")
    const wallIndex = discoverSource.indexOf('<CommunityWall currentUserId={user.id}')
    const onlineNowIndex = discoverSource.indexOf("id='online-now'")

    expect(discoverSource).toContain('@/components/community-wall')
    expect(discoverSource).toContain('<CommunityWall currentUserId={user.id}')
    expect(newProfilesIndex).toBeGreaterThan(-1)
    expect(wallIndex).toBeGreaterThan(-1)
    expect(onlineNowIndex).toBeGreaterThan(-1)
    expect(newProfilesIndex).toBeLessThan(wallIndex)
    expect(wallIndex).toBeLessThan(onlineNowIndex)
  })

  it('ships the expected wall controls for members', () => {
    const componentSource = readFileSync('components/community-wall.tsx', 'utf8')

    expect(componentSource).toContain('createWallPost')
    expect(componentSource).toContain('addWallComment')
    expect(componentSource).toContain('reportWallPost')
    expect(componentSource).toContain('reportWallComment')
    expect(componentSource).toContain('getWallComments')
    expect(componentSource).toContain('Rideaux ouverts')
    expect(componentSource).toContain('Soyez le premier')
    expect(componentSource).toContain("accept='image/jpeg,image/png,image/webp'")
    expect(componentSource).toContain('Ajouter une photo')
    expect(componentSource).toContain('post.image_url')
    expect(componentSource).toContain('bg-[linear-gradient(135deg,rgba(23,3,33,0.98)')
    expect(componentSource).not.toContain('bg-black/20')
  })

  it('does not use muddy grey composer surfaces on the wall', () => {
    const componentSource = readFileSync('components/community-wall.tsx', 'utf8')

    expect(componentSource).toContain('bg-[#170321]/95')
    expect(componentSource).not.toContain('bg-black/22')
    expect(componentSource).not.toContain('bg-black/18')
  })

  it('keeps public landing wall content anonymized and static', () => {
    const landingSource = readFileSync('app/landing-page.tsx', 'utf8')

    expect(landingSource).toContain('Le mur de la communauté')
    expect(landingSource).toContain('rejoignez-nous')
    expect(landingSource).toContain('blur-sm')
    expect(landingSource).not.toContain('getCommunityWallFeed')
    expect(landingSource).not.toContain('CommunityWall')
  })

  it('adds wall moderation to the existing admin moderation page', () => {
    const adminSource = readFileSync('app/admin/moderation/page.tsx', 'utf8')

    expect(adminSource).toContain('getWallModerationQueue')
    expect(adminSource).toContain('restoreWallModerationItem')
    expect(adminSource).toContain('removeWallModerationItem')
    expect(adminSource).toContain('Mur communauté')
  })
})
