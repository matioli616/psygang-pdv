import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CuponsClient from './CuponsClient'
import type { Cupom } from '@/lib/types'

export default async function CuponsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/venda/nova')

  const { data: cupons } = await supabase
    .from('cupons').select('*').order('created_at', { ascending: false })

  return <CuponsClient initialCupons={(cupons as Cupom[]) ?? []} />
}
