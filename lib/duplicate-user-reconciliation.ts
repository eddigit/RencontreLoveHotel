export type DuplicateAccountActivity = {
  id: string
  role: string
  hasPassword: boolean
  onboardingCompleted: boolean
  hasProfile: boolean
  hasAvatar: boolean
  photoCount: number
  conversationCount: number
  messageCount: number
  matchCount: number
  eventCount: number
  createdAt: string
}

export function scoreDuplicateAccount(account: DuplicateAccountActivity) {
  return (
    (account.role === 'admin' ? 100_000 : 0) +
    (account.hasPassword ? 1_000 : 0) +
    (account.onboardingCompleted ? 500 : 0) +
    (account.hasProfile ? 300 : 0) +
    (account.hasAvatar ? 150 : 0) +
    Math.min(account.photoCount, 20) * 50 +
    Math.min(account.conversationCount, 100) * 25 +
    Math.min(account.messageCount, 500) * 10 +
    Math.min(account.matchCount, 1_000) * 2 +
    Math.min(account.eventCount, 100) * 20
  )
}

export function choosePrimaryDuplicateAccount<T extends DuplicateAccountActivity>(
  accounts: T[]
) {
  if (accounts.length < 2) {
    throw new Error('La réconciliation exige au moins deux comptes')
  }

  return [...accounts].sort((left, right) => {
    const scoreDifference = scoreDuplicateAccount(right) - scoreDuplicateAccount(left)
    if (scoreDifference !== 0) return scoreDifference

    const dateDifference = new Date(left.createdAt).getTime() -
      new Date(right.createdAt).getTime()
    if (dateDifference !== 0) return dateDifference

    return left.id.localeCompare(right.id)
  })[0]
}
