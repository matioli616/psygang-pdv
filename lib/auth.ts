import { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type AuthResult =
  | { supabase: SupabaseServer; userId: string; isAdmin: boolean; error: null }
  | { supabase: SupabaseServer; userId: null; isAdmin: false; error: string }

/** Usuário logado e ativo. Retorna o client já criado para reaproveitar. */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, isAdmin: false, error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, ativo')
    .eq('id', user.id)
    .single()

  if (!perfil?.ativo) {
    return { supabase, userId: null, isAdmin: false, error: 'Conta inativa ou aguardando aprovação' }
  }

  return { supabase, userId: user.id, isAdmin: perfil.role === 'admin', error: null }
}

/** Usuário logado, ativo e admin. */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireUser()
  if (auth.error) return auth
  if (!auth.isAdmin) {
    return { supabase: auth.supabase, userId: null, isAdmin: false, error: 'Acesso negado: apenas admins' }
  }
  return auth
}

/** Primeira mensagem de erro de um zod.safeParse falho. */
export function zodErro(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Dados inválidos'
}
