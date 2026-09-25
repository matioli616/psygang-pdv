'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, zodErro } from '@/lib/auth'
import type { ApiResponse, Cupom } from '@/lib/types'

const cupomSchema = z.object({
  codigo:      z.string().trim().min(3, 'Mínimo 3 caracteres').max(20).transform(s => s.toUpperCase()),
  tipo:        z.enum(['fixo', 'percentual']),
  valor:       z.number().finite().min(0.01, 'Valor obrigatório'),
  uso_maximo:  z.number().int().min(1).nullable(),
  validade_em: z.string().datetime().nullable(),
}).refine(c => c.tipo !== 'percentual' || c.valor <= 100, {
  message: 'Percentual máximo 100%',
})
export type CupomInput = z.input<typeof cupomSchema>

const idSchema = z.string().uuid('ID inválido')

/** Cria cupom — apenas admin */
export async function criarCupom(input: CupomInput): Promise<ApiResponse<Cupom>> {
  const parsed = cupomSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { data, error } = await supabase
    .from('cupons')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/cupons')
  return { data: data as Cupom, error: null }
}

/** Atualiza cupom — apenas admin */
export async function atualizarCupom(id: string, input: CupomInput): Promise<ApiResponse<null>> {
  const parsedId = idSchema.safeParse(id)
  const parsed = cupomSchema.safeParse(input)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }
  if (!parsed.success) return { data: null, error: zodErro(parsed.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { error } = await supabase
    .from('cupons')
    .update(parsed.data)
    .eq('id', parsedId.data)

  if (error) return { data: null, error: error.message }

  revalidatePath('/cupons')
  return { data: null, error: null }
}

/** Alterna ativo/inativo de cupom — apenas admin */
export async function toggleAtivoCupom(id: string, ativo: boolean): Promise<ApiResponse<null>> {
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return { data: null, error: zodErro(parsedId.error.issues) }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { data: null, error: authError }

  const { error } = await supabase
    .from('cupons')
    .update({ ativo: Boolean(ativo) })
    .eq('id', parsedId.data)

  if (error) return { data: null, error: error.message }

  revalidatePath('/cupons')
  return { data: null, error: null }
}
