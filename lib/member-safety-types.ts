export const profileReportReasons = [
  'harassment',
  'fake_profile',
  'inappropriate_content',
  'spam',
  'dangerous_behavior',
  'community_rules',
  'other'
] as const

export type ProfileReportReason = typeof profileReportReasons[number]
