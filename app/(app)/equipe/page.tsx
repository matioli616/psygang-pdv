import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EquipeClient from './EquipeClient'

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/venda/nova')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('nome')

  // Comissões do mês atual
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const { data: vendasMes } = await supabase
    .from('vendas')
    .select('vendedor_id, total')
    .gte('created_at', inicioMes.toISOString())

  const faturamentoPorVendedor: Record<string, number> = {}
  vendasMes?.forEach(v => {
    faturamentoPorVendedor[v.vendedor_id] = (faturamentoPorVendedor[v.vendedor_id] ?? 0) + v.total
  })

  return <EquipeClient profiles={profiles ?? []} faturamentoPorVendedor={faturamentoPorVendedor} />
}
