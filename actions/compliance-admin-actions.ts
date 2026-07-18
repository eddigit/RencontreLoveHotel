'use server'

import { getComplianceFlags } from '@/config/compliance'
import { getLegalReadiness } from '@/lib/legal-entity-config'
import { requireAdmin } from '@/lib/server-auth'

export async function getAdminComplianceReadiness() {
  await requireAdmin()
  return {
    flags: getComplianceFlags(),
    readiness: getLegalReadiness()
  }
}
