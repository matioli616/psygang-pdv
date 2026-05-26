import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: 10% das transações server-side
  tracesSampleRate: 0.1,

  environment: process.env.NODE_ENV,

  // Não loga erros esperados de auth (redirect normal)
  beforeSend(event) {
    // Ignora erros de redirect do Next.js (comportamento normal)
    if (event.exception?.values?.[0]?.value?.includes('NEXT_REDIRECT')) {
      return null
    }
    return event
  },
})
