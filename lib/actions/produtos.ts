'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, zodErro } from '@/lib/auth'
import type { ApiResponse, Produto } from '@/lib/types'

const produtoSchema = z.object({
  nome:        z.string().trim().min(2, 'Nome obrigatório').max(120),
  sku:         z.string().trim().max(60).nullish(),
  preco_venda: z.number().finite().min(0, 'Preço inválido'),
  custo:       z.number().finite().min(0, 'Custo inválido'),
  estoque:     z.number().int().min(0, 'Estoque inválido'),
})
type ProdutoInput = z.infer<typeof produtoSchema>

const idSchema = z.string().uuid('ID inválido')

// Sem `custo`: a coluna só é legível via listar_produtos_admin()
const COLUNAS_PUBLICAS = 'id, nome, sku, preco_venda, estoque, ativo, created_at'

/** Cria produto — apenas admin */
export async function criarProduto(
  input: ProdutoInput
): Promise<ApiResponse<Produto>> {
  const parsed = produtoSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const dados = { ...parsed.data, sku: parsed.data.sku || null }
  const { data, error } = await supabase
    .from('produtos')
    .insert(dados)
    .select(COLUNAS_PUBLICAS)
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: { ...data, custo: dados.custo } as Produto, error: null }
}

/** Atualiza produto — apenas admin */
export async function atualizarProduto(
  id: string,
  input: ProdutoInput
): Promise<ApiResponse<null>> {
  const parsedId = idSchema.safeParse(id)
  const parsed = produtoSchema.safeParse(input)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { error } = await supabase
    .from('produtos')
    .update({ ...parsed.data, sku: parsed.data.sku || null })
    .eq('id', parsedId.data)

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: null, error: null }
}

/** Alterna ativo/inativo de produto — apenas admin */
export async function toggleAtivoProduto(
  id: string,
  ativo: boolean
): Promise<ApiResponse<null>> {
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { error } = await supabase
    .from('produtos')
    .update({ ativo: Boolean(ativo) })
    .eq('id', parsedId.data)

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: null, error: null }
}
