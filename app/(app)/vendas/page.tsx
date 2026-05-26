import { createClient } from '@/lib/supabase/server'
import VendasClient from './VendasClient'

const PAGE_SIZE = 20

// ── Tipos ────────────────────────────────────────────────────────────────
interface SearchParams {
  periodo?:   string
  inicio?:    string
  fim?:       string
  pagamento?: string
  vendedor?:  string
}

// ── Resolve intervalo de datas ───────────────────────────────────────────
function resolverDatas(sp: SearchParams): { inicio: string | null; fim: string | null } {
  if (sp.periodo) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const iso    = (d: Date) => d.toISOString()
    const isoFim = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString() }

    switch (sp.periodo) {
      case 'hoje':  return { inicio: iso(hoje), fim: isoFim(hoje) }
      case 'ontem': { const d = new Date(hoje); d.setDate(d.getDate() - 1); return { inicio: iso(d), fim: isoFim(d) } }
      case '7dias': { const d = new Date(hoje); d.setDate(d.getDate() - 6); return { inicio: iso(d), fim: isoFim(hoje) } }
      case '30dias':{ const d = new Date(hoje); d.setDate(d.getDate() - 29);return { inicio: iso(d), fim: isoFim(hoje) } }
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

  const { data: { user } } = await supabase.auth.getUser()

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = meProfile?.role === 'admin'

  const datas = resolverDatas(searchParams)

  const pagamentos = searchParams.pagamento
    ? searchParams.pagamento.split(',').filter(Boolean)
    : []

  // ── Query base ────────────────────────────────────────────────────────
  function buildQuery(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>) {
    let q = supabase
      .from('vendas')
      .select(`
        id, total, desconto, forma_pagamento, observacao, created_at,
        profiles ( id, nome, role ),
        venda_itens (
          id, qtd, preco_unitario,
          produtos ( id, nome, sku )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (datas.inicio) q = q.gte('created_at', datas.inicio)
    if (datas.fim)    q = q.lte('created_at', datas.fim)
    if (pagamentos.length > 0 && pagamentos.length < 4)
      q = q.in('forma_pagamento', pagamentos)
    if (isAdmin && searchParams.vendedor && searchParams.vendedor !== 'todos')
      q = q.eq('vendedor_id', searchParams.vendedor)

    return q
  }

  // Primeira página
  const { data: vendas, count } = await buildQuery(supabase).range(0, PAGE_SIZE - 1)

  // Lista de vendedores para o dropdown (admin only)
  const { data: vendedores } = isAdmin
    ? await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
    : { data: [] }

  const vendedorId = (isAdmin && searchParams.vendedor && searchParams.vendedor !== 'todos')
    ? searchParams.vendedor
    : null

  return (
    <VendasClient
      vendas={(vendas ?? []) as any}
      total={count ?? 0}
      pageSize={PAGE_SIZE}
      isAdmin={isAdmin}
      vendedores={vendedores ?? []}
      filtrosAtivos={{
        periodo:    searchParams.periodo  ?? '',
        inicio:     searchParams.inicio   ?? '',
        fim:        searchParams.fim      ?? '',
        pagamento:  pagamentos as any[],
        vendedor:   searchParams.vendedor ?? 'todos',
      }}
      filtrosParaAction={{
        inicio:     datas.inicio,
        fim:        datas.fim,
        pagamentos,
        vendedorId,
      }}
    />
  )
}
