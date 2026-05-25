import { createClient } from '@/lib/supabase/server'
import VendasClient from './VendasClient'

// ── Tipos ────────────────────────────────────────────────────────────────
interface SearchParams {
  periodo?:   string   // hoje | ontem | 7dias | 30dias
  inicio?:    string   // YYYY-MM-DD
  fim?:       string   // YYYY-MM-DD
  pagamento?: string   // "pix,dinheiro,debito,credito" (vírgula)
  vendedor?:  string   // uuid | "todos"
}

// ── Resolve intervalo de datas ───────────────────────────────────────────
function resolverDatas(sp: SearchParams): { inicio: string | null; fim: string | null } {
  if (sp.periodo) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const iso  = (d: Date) => d.toISOString()
    const isoFim = (d: Date) => {
      const x = new Date(d)
      x.setHours(23, 59, 59, 999)
      return x.toISOString()
    }

    switch (sp.periodo) {
      case 'hoje':
        return { inicio: iso(hoje), fim: isoFim(hoje) }
      case 'ontem': {
        const d = new Date(hoje); d.setDate(d.getDate() - 1)
        return { inicio: iso(d), fim: isoFim(d) }
      }
      case '7dias': {
        const d = new Date(hoje); d.setDate(d.getDate() - 6)
        return { inicio: iso(d), fim: isoFim(hoje) }
      }
      case '30dias': {
        const d = new Date(hoje); d.setDate(d.getDate() - 29)
        return { inicio: iso(d), fim: isoFim(hoje) }
      }
    }
  }

  return {
    inicio: sp.inicio ? new Date(sp.inicio + 'T00:00:00').toISOString() : null,
    fim:    sp.fim    ? new Date(sp.fim    + 'T23:59:59').toISOString() : null,
  }
}

// ── Server Component ─────────────────────────────────────────────────────
export default async function VendasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  // Identidade + role do usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = meProfile?.role === 'admin'

  // ── Montar query com filtros dinâmicos ──────────────────────────────
  let query = supabase
    .from('vendas')
    .select(`
      id, total, desconto, forma_pagamento, observacao, created_at,
      profiles ( id, nome, role ),
      venda_itens (
        id, qtd, preco_unitario,
        produtos ( id, nome, sku )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  // Filtro de data
  const datas = resolverDatas(searchParams)
  if (datas.inicio) query = query.gte('created_at', datas.inicio)
  if (datas.fim)    query = query.lte('created_at', datas.fim)

  // Filtro de forma de pagamento
  const pagamentos = searchParams.pagamento
    ? searchParams.pagamento.split(',').filter(Boolean)
    : []
  if (pagamentos.length > 0 && pagamentos.length < 4) {
    query = query.in('forma_pagamento', pagamentos)
  }

  // Filtro de vendedor (só admin pode filtrar por outros)
  if (isAdmin && searchParams.vendedor && searchParams.vendedor !== 'todos') {
    query = query.eq('vendedor_id', searchParams.vendedor)
  }

  const { data: vendas } = await query

  // Lista de vendedores para o dropdown (admin only)
  const { data: vendedores } = isAdmin
    ? await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
    : { data: [] }

  return (
    <VendasClient
      vendas={(vendas ?? []) as any}
      isAdmin={isAdmin}
      vendedores={vendedores ?? []}
      filtrosAtivos={{
        periodo:   searchParams.periodo  ?? '',
        inicio:    searchParams.inicio   ?? '',
        fim:       searchParams.fim      ?? '',
        pagamento: (pagamentos as any[]),
        vendedor:  searchParams.vendedor ?? 'todos',
      }}
    />
  )
}
