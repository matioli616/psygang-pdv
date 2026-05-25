import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/venda/nova')

  // Busca vendas dos últimos 30 dias com itens
  const from30d = new Date()
  from30d.setDate(from30d.getDate() - 30)

  const { data: vendas } = await supabase
    .from('vendas')
    .select('*, profiles(nome), venda_itens(qtd, preco_unitario, custo_unitario)')
    .gte('created_at', from30d.toISOString())
    .order('created_at', { ascending: true })

  return <DashboardClient vendas={vendas ?? []} />
}
