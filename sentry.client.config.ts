import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura 10% das sessões em replay — útil pra ver o que o usuário fez antes do erro
  replaysOnErrorSampleRate: 1.0,   // 100% quando há erro
  replaysSessionSampleRate: 0.05,  // 5% das sessões normais

  // Performance: 10% das transações (não polui cota no free tier)
  tracesSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,       // não grava texto sensível
      blockAllMedia: false,
    }),
  ],

  // Ignora erros de terceiros comuns que não são nossos
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^AbortError/,
    /^ChunkLoadError/,
  ],

  environment: process.env.NODE_ENV,
})
