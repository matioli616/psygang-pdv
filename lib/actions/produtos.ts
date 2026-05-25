'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, Produto } from '@/lib/types'

interface ProdutoInput {
  nome: string
  sku?: string | null
  preco_venda: number
  custo: number
  estoque: number
}

/** Cria produto — apenas admin */
export async function criarProduto(
  input: ProdutoInput
): Promise<ApiResponse<Produto>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfil?.role !== 'admin') {
    return { data: null, error: 'Acesso negado: apenas admins podem gerenciar produtos' }
  }

  const { data, error } = await supabase
    .from('produtos')
    .insert({ ...input, sku: input.sku || null })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: data as Produto, error: null }
}

/** Atualiza produto — apenas admin */
export async function atualizarProduto(
  id: string,
  input: ProdutoInput
): Promise<ApiResponse<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfil?.role !== 'admin') {
    return { data: null, error: 'Acesso negado: apenas admins podem gerenciar produtos' }
  }

  const { error } = await supabase
    .from('produtos')
    .update({ ...input, sku: input.sku || null })
    .eq('id', id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: null, error: null }
}

/** Alterna ativo/inativo de produto — apenas admin */
export async function toggleAtivoProduto(
  id: string,
  ativo: boolean
): Promise<ApiResponse<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfil?.role !== 'admin') {
    return { data: null, error: 'Acesso negado: apenas admins podem gerenciar produtos' }
  }

  const { error } = await supabase
    .from('produtos')
    .update({ ativo })
    .eq('id', id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/produtos')
  return { data: null, error: null }
}
