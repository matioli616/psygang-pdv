import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReciboClient, { type VendaRecibo } from './ReciboClient'

interface Props {
  params: { venda_id: string }
}

export default async function ReciboPage({ params }: Props) {
  const { venda_id } = params
  const supabase = await createClient()

  const { data: venda, error } = await supabase
    .from('vendas')
    .select(`
      id, numero, total, desconto, forma_pagamento, observacao, created_at,
      profiles ( nome, role ),
      pontos_venda ( nome ),
      venda_itens (
        id, qtd, preco_unitario, desconto_item,
        produtos ( id, nome, sku )
      )
    `)
    .eq('id', venda_id)
    .single()

  if (error || !venda) notFound()

  // Número fixo gravado na venda (sequence no banco)
  return <ReciboClient venda={venda as unknown as VendaRecibo} numero={venda.numero} />
}
