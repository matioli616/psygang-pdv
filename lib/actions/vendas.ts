'use server'

import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, FormaPagamento, Venda } from '@/lib/types'

interface CriarVendaInput {
  forma_pagamento: FormaPagamento
  desconto: number
  observacao?: string
  itens: {
    produto_id: string
    qtd: number
    preco_unitario: number
    custo_unitario: number
  }[]
}

export async function criarVenda(input: CriarVendaInput): Promise<ApiResponse<{ venda_id: string; total: number }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('criar_venda_completa', {
    p_forma_pagamento: input.forma_pagamento,
    p_desconto: input.desconto,
    p_observacao: input.observacao ?? null,
    p_itens: input.itens,
  })

  if (error) return { data: null, error: error.message }
  return { data: data as { venda_id: string; total: number }, error: null }
}

export async function listarVendas(filtro?: { dias?: number }): Promise<ApiResponse<Venda[]>> {
  const supabase = await createClient()

  let query = supabase
    .from('vendas')
    .select('*, profiles(nome, role), venda_itens(*, produtos(nome, sku))')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filtro?.dias) {
    const from = new Date()
    from.setDate(from.getDate() - filtro.dias)
    query = query.gte('created_at', from.toISOString())
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as Venda[], error: null }
}
