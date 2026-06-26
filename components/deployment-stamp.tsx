'use client'

import versionInfo from '../public/version.json'
import { getDeploymentLabel } from '@/lib/deployment-info'

export function DeploymentStamp () {
  return (
    <span className='whitespace-nowrap text-xs text-muted-foreground/80'>
      {getDeploymentLabel(versionInfo)}
    </span>
  )
}
