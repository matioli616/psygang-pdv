import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { PontoVenda, VendaDashboard } from '@/lib/types'

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

  // RPC admin-only: custo_unitario não é legível direto pela API
  const { data: vendas } = await supabase
    .rpc('dashboard_vendas', { p_desde: from60d.toISOString() })

  // Inclui inativos: vendas antigas de um ponto desativado continuam aparecendo
  const { data: pontos } = await supabase
    .from('pontos_venda').select('id, nome, ativo').order('ordem')

  return (
    <DashboardClient
      vendas={(vendas as VendaDashboard[] | null) ?? []}
      pontos={(pontos as PontoVenda[] | null) ?? []}
    />
  )
}
