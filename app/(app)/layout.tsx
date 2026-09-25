import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/BottomNav'
import AppHeader from '@/components/layout/AppHeader'
import { fazerLogout } from '@/lib/actions/perfil'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Cadastro novo entra inativo até um admin liberar em /equipe
  if (!profile?.ativo) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
        <div className="card max-w-sm w-full space-y-4 text-center">
          <p className="text-4xl">🛸</p>
          <h2 className="font-display text-2xl uppercase tracking-wide text-text-primary">
            Aguardando aprovação
          </h2>
          <p className="text-text-muted text-sm">
            Sua conta foi criada, mas precisa ser liberada por um admin antes de usar o sistema.
          </p>
          <form action={fazerLogout}>
            <button type="submit" className="btn-primary w-full">Sair</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <AppHeader profile={profile} />
      <main className="flex-1 pb-24 px-4 pt-4 max-w-lg mx-auto w-full">
        {children}
      </main>
      <BottomNav role={profile?.role ?? 'vendedor'} />
    </div>
  )
}
