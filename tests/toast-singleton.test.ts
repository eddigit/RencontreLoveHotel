import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const componentHook = fs.readFileSync(
  path.join(process.cwd(), 'components/ui/use-toast.ts'),
  'utf8'
)

describe('toast state singleton', () => {
  it('reuses the hook consumed by the global Toaster', () => {
    expect(componentHook).toContain(
      "export { useToast, toast } from '@/hooks/use-toast'"
    )
  })
})
