import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReciboClient from './ReciboClient'

interface Props {
  params: { venda_id: string }
}

export default async function ReciboPage({ params }: Props) {
  const { venda_id } = params
  const supabase = await createClient()

  const { data: venda, error } = await supabase
    .from('vendas')
    .select(`
      id, total, desconto, forma_pagamento, observacao, created_at,
      profiles ( nome, role ),
      venda_itens (
        id, qtd, preco_unitario, custo_unitario,
        produtos ( id, nome, sku )
      )
    `)
    .eq('id', venda_id)
    .single()

  if (error || !venda) notFound()

  // Número sequencial: quantas vendas existem até esta (inclusive)
  const { count: numero } = await supabase
    .from('vendas')
    .select('*', { count: 'exact', head: true })
    .lte('created_at', venda.created_at)

  return <ReciboClient venda={venda as any} numero={numero ?? 1} />
}
