export function friendlyErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return /[\u4e00-\u9fff]/.test(message) ? message : fallback
}
