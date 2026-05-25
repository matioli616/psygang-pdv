'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types'

interface AtualizarMembroInput {
  id: string
  nome: string
  role: 'admin' | 'vendedor'
  comissao_pct: number
}

/** Atualiza perfil de membro da equipe — apenas admin */
export async function atualizarMembro(
  input: AtualizarMembroInput
): Promise<ApiResponse<null>> {
  const supabase = await createClient()

  // Verifica autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  // Verifica role admin
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfil?.role !== 'admin') {
    return { data: null, error: 'Acesso negado: apenas admins podem editar membros' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      nome: input.nome.trim(),
      role: input.role,
      comissao_pct: input.comissao_pct,
    })
    .eq('id', input.id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/equipe')
  return { data: null, error: null }
}

/** Alterna ativo/inativo de membro — apenas admin */
export async function toggleAtivoMembro(
  membroId: string,
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
    return { data: null, error: 'Acesso negado: apenas admins podem editar membros' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ativo })
    .eq('id', membroId)

  if (error) return { data: null, error: error.message }

  revalidatePath('/equipe')
  return { data: null, error: null }
}
