import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GET } from '@/app/sw.js/route'
import { isPublicPath } from '@/lib/route-access'

describe('PWA service worker and update lifecycle', () => {
  it('serves a deployment-versioned public worker that never caches private pages', async () => {
    const previous = process.env.VERCEL_GIT_COMMIT_SHA
    process.env.VERCEL_GIT_COMMIT_SHA = 'qa-v1'
    const v1 = await (await GET()).text()
    process.env.VERCEL_GIT_COMMIT_SHA = 'qa-v2'
    const response = await GET()
    const source = await response.text()
    if (previous === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = previous

    expect(response.headers.get('Content-Type')).toContain('application/javascript')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(v1).toContain('/* LHR service worker: qa-v1 */')
    expect(source).toContain('/* LHR service worker: qa-v2 */')
    expect(source).not.toBe(v1)
    expect(source).toContain("lhr-public-assets-' + VERSION")
    expect(source).toContain("request.mode === 'navigate'")
    expect(source).toContain("'Cache-Control': 'no-store'")
    expect(source).toContain("url.pathname.startsWith('/messages')")
    expect(source).toContain("url.pathname.startsWith('/_next/static/')")
    expect(isPublicPath('/sw.js')).toBe(true)
  })

  it('waits for the user and reloads only after the local tab changes controller', () => {
    const component = readFileSync('components/PwaUpdateNotification.tsx', 'utf8')
    expect(component).toContain("navigator.serviceWorker.register('/sw.js', { scope: '/' })")
    expect(component).toContain("reg.addEventListener('updatefound', observeInstallingWorker)")
    expect(component).toContain('offerWaitingWorker(reg.waiting)')
    expect(component).toContain("waitingWorker.postMessage({ type: 'SKIP_WAITING' })")
    expect(component).toContain("navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)")
    expect(component).toContain('if (!reloadAfterControllerChange.current) return')
    expect(component).toContain("window.addEventListener('focus', revalidate)")
    expect(component).toContain("window.addEventListener('online', revalidate)")
  })
})
