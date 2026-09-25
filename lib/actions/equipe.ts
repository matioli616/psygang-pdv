'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, zodErro } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

const membroSchema = z.object({
  id:           z.string().uuid('ID inválido'),
  nome:         z.string().trim().min(2, 'Nome muito curto').max(80),
  role:         z.enum(['admin', 'vendedor']),
  comissao_pct: z.number().finite().min(0, 'Comissão mínima 0%').max(100, 'Comissão máxima 100%'),
})
type AtualizarMembroInput = z.infer<typeof membroSchema>

/** Atualiza perfil de membro da equipe — apenas admin */
export async function atualizarMembro(
  input: AtualizarMembroInput
): Promise<ApiResponse<null>> {
  const parsed = membroSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { id, ...dados } = parsed.data
  const { error } = await supabase
    .from('profiles')
    .update(dados)
    .eq('id', id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/equipe')
  return { data: null, error: null }
}

/** Alterna ativo/inativo de membro — apenas admin */
export async function toggleAtivoMembro(
  membroId: string,
  ativo: boolean
): Promise<ApiResponse<null>> {
  const parsedId = z.string().uuid('ID inválido').safeParse(membroId)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { error } = await supabase
    .from('profiles')
    .update({ ativo: Boolean(ativo) })
    .eq('id', parsedId.data)

  if (error) return { data: null, error: error.message }

  revalidatePath('/equipe')
  return { data: null, error: null }
}
