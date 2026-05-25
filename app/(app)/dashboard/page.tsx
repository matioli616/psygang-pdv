import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/venda/nova')

  // 60 dias: suporta comparação de período atual vs anterior
  const from60d = new Date()
  from60d.setDate(from60d.getDate() - 60)
  from60d.setHours(0, 0, 0, 0)

  const { data: vendas } = await supabase
    .from('vendas')
    .select(`
      id, total, desconto, forma_pagamento, vendedor_id, created_at,
      profiles(nome),
      venda_itens(qtd, preco_unitario, custo_unitario, produtos(nome))
    `)
    .gte('created_at', from60d.toISOString())
    .order('created_at', { ascending: false })

  return <DashboardClient vendas={(vendas as any[]) ?? []} />
}
