'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function AppHeader({ profile }: { profile: Profile | null }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
            <span className="font-mono text-neon-purple text-xs font-bold">{initials}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-bg-elevated border border-white/10 flex items-center justify-center text-text-muted hover:text-red-400 hover:border-red-400/30 transition-colors active:scale-95"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
