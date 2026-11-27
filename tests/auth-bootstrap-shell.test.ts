import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('auth bootstrap shell', () => {
  it('uses a neutral graphite document frame before the application mounts', () => {
    const layout = source('app/layout.tsx')
    const globals = source('app/globals.css')
    const providers = source('components/providers.tsx')

    expect(layout).toContain("themeColor: '#191714'")
    expect(layout).toContain('bg-[#191714] text-[#f1eee8]')
    expect(layout).not.toContain('from-[#1a0d2e] to-[#3d1155]')
    expect(globals).toContain('.auth-bootstrap-frame')
    expect(providers).toContain("fallback={<div className='auth-bootstrap-frame'")
  })

  it('does not temporarily render visitor navigation while the session is unresolved', () => {
    const shell = source('components/site-shell.tsx')

    expect(shell).toContain('const { user, logout, isLoading } = useAuth()')
    expect(shell).toContain("if (isLoading && pathname !== '/' && !publicStandaloneRoutes.has(pathname))")
    expect(shell).toContain('className={styles.authResolvingFrame}')
  })

  it('keeps root and legacy route loading states within the graphite palette', () => {
    const loadingFiles = [
      'app/loading.tsx',
      'app/matches/loading.tsx',
      'app/onboarding/loading.tsx',
      'app/loolyyb-memecoin/loading.tsx',
      'app/messages/loading.tsx'
    ]

    expect(source(loadingFiles[0])).toContain('auth-bootstrap-frame')

    for (const file of loadingFiles.slice(1)) {
      expect(source(file)).toContain('#191714')
    }
  })
})
