'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireUser, zodErro } from '@/lib/auth'
import type { ApiResponse, FormaPagamento, TipoDesconto, Venda } from '@/lib/types'

const formaPagamentoSchema = z.enum(['dinheiro', 'credito', 'debito', 'pix'])

// Preço e custo NÃO são enviados: a RPC lê da tabela produtos
const criarVendaSchema = z.object({
  forma_pagamento: formaPagamentoSchema,
  desconto:        z.number().finite().min(0, 'Desconto inválido'),   // desconto manual R$ na venda
  observacao:      z.string().max(500).optional(),
  cupon_id:        z.string().uuid().nullish(),
  itens: z.array(z.object({
    produto_id:    z.string().uuid(),
    qtd:           z.number().int().min(1, 'Quantidade inválida').max(9999),
    desconto_item: z.number().finite().min(0, 'Desconto inválido'),
  })).min(1, 'Adicione produtos ao carrinho'),
})
type CriarVendaInput = z.infer<typeof criarVendaSchema>

export interface VendaCriada {
  venda_id: string
  numero: number
  total: number
  desconto_total: number
}

export async function criarVenda(
  input: CriarVendaInput
): Promise<ApiResponse<VendaCriada>> {
  const parsed = criarVendaSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireUser()
  if (authError) return { data: null, error: authError }

  const { data, error } = await supabase.rpc('criar_venda_completa', {
    p_forma_pagamento: parsed.data.forma_pagamento,
    p_desconto:        parsed.data.desconto,
    p_observacao:      parsed.data.observacao ?? null,
    p_itens:           parsed.data.itens,
    p_cupon_id:        parsed.data.cupon_id ?? null,
  })

  if (error) return { data: null, error: error.message }

  revalidatePath('/vendas')
  revalidatePath('/dashboard')
  return { data: data as VendaCriada, error: null }
}

const editarVendaSchema = z.object({
  vendaId:         z.string().uuid('ID inválido'),
  forma_pagamento: formaPagamentoSchema,
  observacao:      z.string().max(500),
})

export async function editarVenda(
  vendaId: string,
  dados: { forma_pagamento: FormaPagamento; observacao: string }
): Promise<ApiResponse<null>> {
  const parsed = editarVendaSchema.safeParse({ vendaId, ...dados })
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, userId, isAdmin, error: authError } = await requireUser()
  if (authError) return { data: null, error: authError }

  // Vendedor só edita própria venda; admin edita qualquer uma (reforçado por RLS)
  const { error, data: rows } = await supabase
    .from('vendas')
    .update({
      forma_pagamento: parsed.data.forma_pagamento,
      observacao: parsed.data.observacao.trim() || null,
    })
    .eq('id', parsed.data.vendaId)
    .match(isAdmin ? {} : { vendedor_id: userId })
    .select('id')

  if (error) return { data: null, error: error.message }
  if (!rows || rows.length === 0) return { data: null, error: 'Venda não encontrada ou sem permissão' }

  revalidatePath('/vendas')
  revalidatePath('/dashboard')
  return { data: null, error: null }
}

/** Exclui venda — apenas admin (RLS também exige admin) */
export async function deletarVenda(
  vendaId: string
): Promise<ApiResponse<null>> {
  const parsedId = z.string().uuid('ID inválido').safeParse(vendaId)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  // O cascade apaga os itens automaticamente
  const { error, data: rows } = await supabase
    .from('vendas')
    .delete()
    .eq('id', parsedId.data)
    .select('id')

  if (error) return { data: null, error: error.message }
  if (!rows || rows.length === 0) return { data: null, error: 'Venda não encontrada' }

  revalidatePath('/vendas')
  revalidatePath('/dashboard')
  return { data: null, error: null }
}

// Filtros serializados passados pelo VendasClient ao carregar mais páginas
export interface FiltrosVendas {
  inicio:     string | null
  fim:        string | null
  pagamentos: string[]   // ['pix','dinheiro',...]
  vendedorId: string | null
}

export async function carregarMaisVendas(
  filtros: FiltrosVendas,
  offset: number,
  pageSize = 20,
): Promise<ApiResponse<Venda[]>> {
  const { supabase, isAdmin, error: authError } = await requireUser()
  if (authError) return { data: null, error: authError }

  offset   = Math.max(0, Math.trunc(offset) || 0)
  pageSize = Math.min(100, Math.max(1, Math.trunc(pageSize) || 20))

  let query = supabase
    .from('vendas')
    .select(`
      id, vendedor_id, total, desconto, forma_pagamento, observacao, created_at,
      profiles ( id, nome, role ),
      venda_itens ( id, qtd, preco_unitario, produtos ( id, nome, sku ) )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (filtros.inicio) query = query.gte('created_at', filtros.inicio)
  if (filtros.fim)    query = query.lte('created_at', filtros.fim)
  if (filtros.pagamentos.length > 0 && filtros.pagamentos.length < 4)
    query = query.in('forma_pagamento', filtros.pagamentos)
  if (isAdmin && filtros.vendedorId)
    query = query.eq('vendedor_id', filtros.vendedorId)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as unknown as Venda[], error: null }
}

export async function validarCupon(
  codigo: string
): Promise<ApiResponse<{ id: string; tipo: TipoDesconto; valor: number }>> {
  const parsed = z.string().trim().min(1).max(20).safeParse(codigo)
  if (!parsed.success) return { data: null, error: 'Cupom inválido ou não encontrado' }

  const { supabase, error: authError } = await requireUser()
  if (authError) return { data: null, error: authError }

  const { data, error } = await supabase
    .from('cupons')
    .select('id, tipo, valor, uso_maximo, usos, validade_em')
    .eq('codigo', parsed.data.toUpperCase())
    .eq('ativo', true)
    .single()

  if (error || !data) return { data: null, error: 'Cupom inválido ou não encontrado' }

  if (data.validade_em && new Date(data.validade_em) < new Date()) {
    return { data: null, error: 'Cupom expirado' }
  }
  if (data.uso_maximo !== null && data.usos >= data.uso_maximo) {
    return { data: null, error: 'Cupom esgotado' }
  }

  // O valor em R$ é recalculado no carrinho e, de forma definitiva, na RPC
  return {
    data: { id: data.id, tipo: data.tipo as TipoDesconto, valor: data.valor },
    error: null,
  }
}
