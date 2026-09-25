// ============================================
// Fórmulas financeiras (CLAUDE.md — imutáveis)
// Funções puras: usadas pelo dashboard e cobertas por tests/metrics.test.ts
// ============================================

import type { VendaDashboard } from '@/lib/types'

type VendaKPI = Pick<VendaDashboard, 'total'> & {
  venda_itens: { qtd: number; custo_unitario: number }[]
}

export interface KPIs {
  faturamento: number
  cpv: number
  lucro: number
  margem: number
  ticketMedio: number
  total: number
}

export function calcKPIs(vendas: VendaKPI[]): KPIs {
  // Faturamento = SUM(vendas.total)
  const faturamento = vendas.reduce((s, v) => s + Number(v.total), 0)
  // CPV = SUM(venda_itens.custo_unitario * quantidade)
  const cpv = vendas.reduce(
    (s, v) => s + v.venda_itens.reduce((si, i) => si + Number(i.custo_unitario) * i.qtd, 0), 0
  )
  // Lucro = Faturamento Bruto - CPV - SUM(descontos)
  // vendas.total já é líquido (bruto - desconto), então isso equivale a
  // SUM(vendas.total) - CPV. Subtrair o desconto de novo contaria duas vezes.
  const lucro = faturamento - cpv
  // Margem % = (Lucro / Faturamento) * 100
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0
  // Ticket Médio = Faturamento / COUNT(vendas)
  const ticketMedio = vendas.length > 0 ? faturamento / vendas.length : 0
  return { faturamento, cpv, lucro, margem, ticketMedio, total: vendas.length }
}

// Comissão = Faturamento Vendedor * (comissao_pct / 100)
export function calcComissao(faturamentoVendedor: number, comissaoPct: number): number {
  return faturamentoVendedor * (comissaoPct / 100)
}

/** Variação % entre períodos; null quando não há base de comparação */
export function calcVariacao(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
