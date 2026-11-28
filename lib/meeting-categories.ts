export const meetingCategories = [
  { value: 'classic', label: 'Classique' },
  { value: 'libertine', label: 'Libertine' },
  { value: 'bdsm', label: 'BDSM / D·s' },
  { value: 'discreet', label: 'Discrète' }
] as const

export type MeetingCategory = typeof meetingCategories[number]['value']

export function selectedMeetingCategories(intents: readonly string[], shareRoles: boolean, roles: readonly string[]): MeetingCategory[] {
  const sharesBdsmRole = shareRoles && roles.some(role => ['discovery', 'dominant', 'submissive', 'switch'].includes(role))
  return meetingCategories.filter(({ value }) => intents.includes(value) || (value === 'bdsm' && sharesBdsmRole)).map(({ value }) => value)
}
