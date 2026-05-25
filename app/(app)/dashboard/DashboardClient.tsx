'use client'

import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, ShoppingBag, Package, Percent } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { Venda } from '@/lib/types'

type Filtro = '7d' | '30d' | 'hoje'

const NEON_PURPLE = '#B026FF'
const NEON_GREEN = '#39FF14'
const NEON_PINK = '#FF10F0'
const CORES_PIE = [NEON_PURPLE, NEON_GREEN, NEON_PINK, '#666']

export default function DashboardClient({ vendas }: { vendas: Venda[] }) {
  const [filtro, setFiltro] = useState<Filtro>('30d')

  const vendasFiltradas = useMemo(() => {
    const now = new Date()
    const dias = filtro === 'hoje' ? 0 : filtro === '7d' ? 7 : 30
    if (filtro === 'hoje') {
      return vendas.filter(v => {
        const d = new Date(v.created_at)
        return d.toDateString() === now.toDateString()
      })
    }
    const from = new Date()
    from.setDate(from.getDate() - dias)
    return vendas.filter(v => new Date(v.created_at) >= from)
  }, [vendas, filtro])

  const kpis = useMemo(() => {
    const faturamento = vendasFiltradas.reduce((acc, v) => acc + v.total, 0)
    const cpv = vendasFiltradas.reduce((acc, v) => {
      return acc + (v.venda_itens ?? []).reduce((s, i) => s + (i.custo_unitario * i.qtd), 0)
    }, 0)
    const totalDescontos = vendasFiltradas.reduce((acc, v) => acc + v.desconto, 0)
    const lucro = faturamento - cpv - totalDescontos
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0
    const ticketMedio = vendasFiltradas.length > 0 ? faturamento / vendasFiltradas.length : 0

    return { faturamento, cpv, lucro, margem, ticketMedio, totalVendas: vendasFiltradas.length }
  }, [vendasFiltradas])

  // Gráfico de linha: faturamento por dia
  const chartLinha = useMemo(() => {
    const map: Record<string, number> = {}
    vendasFiltradas.forEach(v => {
      const d = formatDateShort(v.created_at)
      map[d] = (map[d] ?? 0) + v.total
    })
    return Object.entries(map).map(([data, valor]) => ({ data, valor }))
  }, [vendasFiltradas])

  // Gráfico de pizza: forma de pagamento
  const chartPizza = useMemo(() => {
    const map: Record<string, number> = {}
    vendasFiltradas.forEach(v => {
      map[v.forma_pagamento] = (map[v.forma_pagamento] ?? 0) + v.total
    })
    return Object.entries(map).map(([name, value]) => ({ name: name.toUpperCase(), value }))
  }, [vendasFiltradas])

  // Ranking de vendedores
  const ranking = useMemo(() => {
    const map: Record<string, { nome: string; total: number; qtd: number }> = {}
    vendasFiltradas.forEach(v => {
      const id = v.vendedor_id
      const nome = (v as any).profiles?.nome ?? 'Desconhecido'
      if (!map[id]) map[id] = { nome, total: 0, qtd: 0 }
      map[id].total += v.total
      map[id].qtd += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [vendasFiltradas])

  const kpiCards = [
    {
      label: 'Faturamento',
      value: formatCurrency(kpis.faturamento),
      icon: <TrendingUp size={20} className="text-neon-green" />,
      color: 'text-neon-green',
    },
    {
      label: 'Lucro',
      value: formatCurrency(kpis.lucro),
      icon: <Package size={20} className="text-neon-purple" />,
      color: 'text-neon-purple',
    },
    {
      label: 'Margem',
      value: `${kpis.margem.toFixed(1)}%`,
      icon: <Percent size={20} className="text-neon-pink" />,
      color: 'text-neon-pink',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(kpis.ticketMedio),
      icon: <ShoppingBag size={20} className="text-text-secondary" />,
      color: 'text-text-primary',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header + Filtros */}
      <div className="flex items-center justify-between">
        <h2 className="page-title text-2xl">Dashboard</h2>
        <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 border border-white/5">
          {(['hoje', '7d', '30d'] as Filtro[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                filtro === f
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/40'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpiCards.map(card => (
          <div key={card.label} className="card">
            <div className="flex items-center justify-between mb-2">
              {card.icon}
              <span className="text-xs uppercase tracking-widest text-text-muted font-mono">
                {card.label}
              </span>
            </div>
            <p className={`font-mono text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Total vendas chip */}
      <div className="flex gap-2">
        <div className="badge-purple">
          {kpis.totalVendas} vendas
        </div>
        <div className="badge bg-white/5 text-text-muted border border-white/10">
          CPV: {formatCurrency(kpis.cpv)}
        </div>
      </div>

      {/* Gráfico de linha */}
      {chartLinha.length > 0 && (
        <div className="card">
          <p className="field-label mb-3">Faturamento por Dia</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartLinha}>
              <XAxis
                dataKey="data"
                tick={{ fill: '#666', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: '#141414',
                  border: '1px solid rgba(176,38,255,0.3)',
                  borderRadius: 12,
                  color: '#fafafa',
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatCurrency(v), 'Total']}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke={NEON_PURPLE}
                strokeWidth={2}
                dot={false}
                activeDot={{ fill: NEON_PURPLE, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pizza + Ranking side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pizza */}
        {chartPizza.length > 0 && (
          <div className="card">
            <p className="field-label mb-2">Pagamentos</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={chartPizza}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {chartPizza.map((_, i) => (
                    <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#141414',
                    border: '1px solid rgba(176,38,255,0.3)',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [formatCurrency(v)]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {chartPizza.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CORES_PIE[i % CORES_PIE.length] }}
                  />
                  <span className="text-[10px] text-text-muted font-mono">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranking */}
        <div className="card">
          <p className="field-label mb-2">Ranking</p>
          {ranking.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((v, i) => (
                <div key={v.nome} className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold w-4 ${i === 0 ? 'text-neon-green' : 'text-text-muted'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-xs truncate">{v.nome}</p>
                    <p className="money text-xs">{formatCurrency(v.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas vendas */}
      <div className="card">
        <p className="field-label mb-3">Últimas Vendas</p>
        {vendasFiltradas.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">Sem vendas no período</p>
        ) : (
          <div className="space-y-2">
            {[...vendasFiltradas].reverse().slice(0, 10).map(venda => (
              <div
                key={venda.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-text-primary text-sm">{(venda as any).profiles?.nome ?? 'Vendedor'}</p>
                  <p className="text-text-muted text-xs font-mono">
                    {new Date(venda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{venda.forma_pagamento.toUpperCase()}
                  </p>
                </div>
                <span className="money text-sm">{formatCurrency(venda.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
