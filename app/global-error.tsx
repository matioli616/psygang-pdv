'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="bg-[#0a0a0a] min-h-dvh flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-5xl">🛸</p>
          <h1 className="text-[#B026FF] font-mono text-xl uppercase tracking-widest">
            Erro inesperado
          </h1>
          <p className="text-[#666] text-sm">
            Algo quebrou. O erro foi registrado automaticamente.
          </p>
          {error.digest && (
            <p className="text-[#444] text-xs font-mono">
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[#B026FF]/20 border border-[#B026FF]/40
                       text-[#B026FF] text-sm font-semibold hover:bg-[#B026FF]/30 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
