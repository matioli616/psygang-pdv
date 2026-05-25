import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

export default async function VendasPage() {
  const supabase = await createClient()

  const { data: vendas } = await supabase
    .from('vendas')
    .select('*, profiles(nome), venda_itens(qtd, preco_unitario, produtos(nome))')
    .order('created_at', { ascending: false })
    .limit(50)

  const BADGE_PAGAMENTO: Record<string, string> = {
    pix: 'badge-green',
    dinheiro: 'badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    credito: 'badge-purple',
    debito: 'badge bg-blue-500/20 text-blue-400 border border-blue-500/30',
  }

  return (
    <div className="space-y-4">
      <h2 className="page-title text-2xl">Histórico</h2>

      {(!vendas || vendas.length === 0) ? (
        <div className="text-center py-16 text-text-muted">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma venda registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendas.map(venda => (
            <div key={venda.id} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-primary font-medium">{(venda as any).profiles?.nome}</p>
                  <p className="text-text-muted text-xs font-mono">{formatDate(venda.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="money text-lg">{formatCurrency(venda.total)}</p>
                  {venda.desconto > 0 && (
                    <p className="text-red-400 text-xs font-mono">-{formatCurrency(venda.desconto)}</p>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-1">
                {((venda as any).venda_itens ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-text-muted">
                    <span>{item.qtd}x {item.produtos?.nome}</span>
                    <span className="font-mono">{formatCurrency(item.preco_unitario * item.qtd)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className={BADGE_PAGAMENTO[venda.forma_pagamento] ?? 'badge'}>
                  {venda.forma_pagamento}
                </span>
                {venda.observacao && (
                  <span className="text-text-muted text-xs truncate">{venda.observacao}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
