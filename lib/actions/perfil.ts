'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types'

export async function atualizarNome(
  nome: string
): Promise<ApiResponse<null>> {
  const nome_limpo = nome.trim()
  if (!nome_limpo || nome_limpo.length < 2) {
    return { data: null, error: 'Nome deve ter pelo menos 2 caracteres' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ nome: nome_limpo })
    .eq('id', user.id)

  if (error) return { data: null, error: error.message }

  revalidatePath('/perfil')
  revalidatePath('/', 'layout')
  return { data: null, error: null }
}

export async function atualizarSenha(
  senhaAtual: string,
  novaSenha: string
): Promise<ApiResponse<null>> {
  if (novaSenha.length < 6) {
    return { data: null, error: 'Nova senha deve ter pelo menos 6 caracteres' }
  }

  const supabase = await createClient()

  // Verifica a senha atual re-autenticando
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { data: null, error: 'Não autenticado' }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senhaAtual,
  })

  if (signInError) {
    return { data: null, error: 'Senha atual incorreta' }
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { data: null, error: error.message }

  return { data: null, error: null }
}

export async function fazerLogout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
