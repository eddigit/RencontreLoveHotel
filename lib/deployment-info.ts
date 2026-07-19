export interface DeploymentInfo {
  version: string
  buildNumber: number
  deploymentDate: string
}

export function formatDeploymentDate (
  isoDate: string,
  timeZone = 'Europe/Paris'
) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).formatToParts(new Date(isoDate))

  const value = (type: string) =>
    parts.find(part => part.type === type)?.value ?? ''

  return `${value('day')}/${value('month')}/${value('year')} ${value('hour')}:${value('minute')}`
}

export function getDeploymentLabel (info: DeploymentInfo) {
  return `Déploiement : ${formatDeploymentDate(info.deploymentDate)} · build ${info.buildNumber}`
}
