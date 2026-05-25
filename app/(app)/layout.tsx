import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/BottomNav'
import AppHeader from '@/components/layout/AppHeader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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
