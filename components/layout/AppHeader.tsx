'use client'

import Link from 'next/link'
import type { Profile } from '@/lib/types'

export default function AppHeader({ profile }: { profile: Profile | null }) {
  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PG'

  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-white/5 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-neon-purple tracking-wider uppercase">
            PsyGang
          </h1>
          {profile && (
            <p className="text-text-muted text-xs">
              {profile.role === 'admin' ? 'Admin' : 'Vendedor'} · {profile.nome}
            </p>
          )}
        </div>

        {/* Avatar → link pro perfil */}
        <Link
          href="/perfil"
          className="w-9 h-9 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center hover:bg-neon-purple/30 transition-colors active:scale-95"
        >
          <span className="font-mono text-neon-purple text-xs font-bold">{initials}</span>
        </Link>
      </div>
    </header>
  )
}
