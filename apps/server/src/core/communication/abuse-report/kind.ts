export enum AbuseReportKind {
  MAIL = 'mail',
  CHAT = 'chat',
}

export const isAbuseReportKind = (value: unknown): value is AbuseReportKind => {
  return Object.values(AbuseReportKind).includes(value as AbuseReportKind)
}
