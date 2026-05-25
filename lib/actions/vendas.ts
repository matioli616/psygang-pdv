'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, FormaPagamento, Venda } from '@/lib/types'

interface ItemInput {
  produto_id: string
  qtd: number
  preco_unitario: number
  custo_unitario: number
  desconto_item: number
}

interface CriarVendaInput {
  forma_pagamento: FormaPagamento
  desconto: number        // desconto manual R$ na venda (sem itens e sem cupom)
  observacao?: string
  itens: ItemInput[]
  cupon_id?: string | null
}

export async function criarVenda(
  input: CriarVendaInput
): Promise<ApiResponse<{ venda_id: string; total: number; desconto_total: number }>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { data, error } = await supabase.rpc('criar_venda_completa', {
    p_forma_pagamento: input.forma_pagamento,
    p_desconto:        input.desconto,
    p_observacao:      input.observacao ?? null,
    p_itens:           input.itens,
    p_cupon_id:        input.cupon_id ?? null,
  })

  if (error) return { data: null, error: error.message }
  return { data: data as any, error: null }
}

export async function deletarVenda(
  vendaId: string
): Promise<ApiResponse<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  // Deletar a venda — o cascade apaga os itens automaticamente
  // e o trigger `restaurar_estoque` devolve o estoque de cada item
  const { error } = await supabase
    .from('vendas')
    .delete()
    .eq('id', vendaId)

  if (error) return { data: null, error: error.message }

  revalidatePath('/vendas')
  revalidatePath('/dashboard')
  return { data: null, error: null }
}

export async function listarVendas(
  filtro?: { dias?: number }
): Promise<ApiResponse<Venda[]>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

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

export async function validarCupon(
  codigo: string
): Promise<ApiResponse<{ id: string; tipo: string; valor: number; valorDesconto: number } | null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('cupons')
    .select('id, tipo, valor, uso_maximo, usos, validade_em')
    .eq('codigo', codigo.toUpperCase().trim())
    .eq('ativo', true)
    .single()

  if (error || !data) return { data: null, error: 'Cupom inválido ou não encontrado' }

  if (data.validade_em && new Date(data.validade_em) < new Date()) {
    return { data: null, error: 'Cupom expirado' }
  }
  if (data.uso_maximo !== null && data.usos >= data.uso_maximo) {
    return { data: null, error: 'Cupom esgotado' }
  }

  // valorDesconto será calculado no cliente com base no subtotal
  return {
    data: { id: data.id, tipo: data.tipo, valor: data.valor, valorDesconto: 0 },
    error: null,
  }
}
