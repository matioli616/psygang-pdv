import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProdutosClient from './ProdutosClient'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/venda/nova')

  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .order('nome')

  return <ProdutosClient initialProdutos={produtos ?? []} />
}
