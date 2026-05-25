'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingBag, Percent,
  DollarSign, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────
type ItemVenda = {
  qtd: number
  preco_unitario: number
  custo_unitario: number
  produtos: { nome: string } | null
}

type VendaRaw = {
  id: string
  total: number
  desconto: number
  forma_pagamento: string
  vendedor_id: string
  created_at: string
  profiles: { nome: string } | null
  venda_itens: ItemVenda[]
}

type Filtro = 'hoje' | 'ontem' | '7d' | 'mes' | 'custom'

// ─────────────────────────────────────────
// HOOK: count-up animado
// ─────────────────────────────────────────
function useCountUp(end: number, duration = 900) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    setValue(0)
    if (end === 0) return
    let raf: number
    let startTime: number | null = null

    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cúbico
      setValue(eased * end)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [end, duration])

  return value
}

// ─────────────────────────────────────────
// HELPERS DE DATA
// ─────────────────────────────────────────
const startOf = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)

const endOf = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

const subDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() - n)
  return r
}

const fmtShort = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

function getRange(filtro: Filtro, customFrom: string, customTo: string) {
  const now = new Date()
  switch (filtro) {
    case 'hoje':   return { from: startOf(now), to: now }
    case 'ontem': { const y = subDays(now, 1); return { from: startOf(y), to: endOf(y) } }
    case '7d':    return { from: startOf(subDays(now, 7)), to: now }
    case 'mes':   return { from: startOf(subDays(now, 30)), to: now }
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : startOf(subDays(now, 7)),
        to:   customTo   ? new Date(customTo   + 'T23:59:59') : endOf(now),
      }
  }
}

function getCompareRange(filtro: Filtro, from: Date, to: Date) {
  if (filtro === 'ontem' || filtro === 'custom') return null
  const dur = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - dur), to: new Date(from.getTime() - 1) }
}

// ─────────────────────────────────────────
// FÓRMULAS FINANCEIRAS (claude.md — imutáveis)
// ─────────────────────────────────────────
function calcKPIs(vendas: VendaRaw[]) {
  // Faturamento = SUM(vendas.total)
  const faturamento = vendas.reduce((s, v) => s + v.total, 0)
  // CPV = SUM(venda_itens.custo_unitario * quantidade)
  const cpv = vendas.reduce(
    (s, v) => s + v.venda_itens.reduce((si, i) => si + i.custo_unitario * i.qtd, 0), 0
  )
  // Lucro = Faturamento - CPV - SUM(descontos)
  const descontos = vendas.reduce((s, v) => s + v.desconto, 0)
  const lucro = faturamento - cpv - descontos
  // Margem % = (Lucro / Faturamento) * 100
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0
  // Ticket Médio = Faturamento / COUNT(vendas)
  const ticketMedio = vendas.length > 0 ? faturamento / vendas.length : 0
  return { faturamento, cpv, lucro, margem, ticketMedio, total: vendas.length }
}

function calcVariacao(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

// ─────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-bg-overlay rounded-xl animate-pulse ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex gap-1.5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-16" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-44" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-52" />
      <Skeleton className="h-64" />
    </div>
  )
}

function KPICard({
  label, value, compare, icon, formatter, suffix = '',
}: {
  label: string
  value: number
  compare: number | null
  icon: React.ReactNode
  formatter: (n: number) => string
  suffix?: string
}) {
  const animated = useCountUp(value)
  const v = compare !== null ? calcVariacao(value, compare) : null
  const isUp = v !== null && v >= 0

  return (
    <div className="card group hover:scale-[1.02] hover:border-neon-purple/40 active:scale-[0.98] transition-all duration-200 cursor-default select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="field-label">{label}</span>
        <span className="text-text-muted group-hover:text-neon-purple transition-colors">
          {icon}
        </span>
      </div>
      <p className="money text-xl font-bold leading-tight">
        {formatter(animated)}{suffix}
      </p>
      {v !== null && (
        <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-mono ${isUp ? 'text-neon-green' : 'text-red-400'}`}>
          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(v).toFixed(1)}% vs anterior
        </div>
      )}
      {v === null && compare !== null && (
        <p className="text-text-muted text-[11px] font-mono mt-1.5">sem comparativo</p>
      )}
    </div>
  )
}

const BADGE_PG: Record<string, string> = {
  pix:     'badge-green',
  credito: 'badge-purple',
  debito:  'badge bg-blue-500/20 text-blue-400 border border-blue-500/30',
  dinheiro:'badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
}

// Tooltip dark reutilizável
function DarkTip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-elevated border border-neon-purple/30 rounded-xl px-3 py-2 text-xs shadow-neon-purple">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-neon-green">
          {currency ? formatCurrency(p.value) : `${p.value} un.`}
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────
const CORES_NEON  = ['#B026FF', '#39FF14', '#FF10F0', '#555']
const CORES_BARS  = ['#B026FF', '#39FF14', '#FF10F0', '#aa00ee', '#00ffaa']

export default function DashboardClient({ vendas }: { vendas: VendaRaw[] }) {
  const [filtro, setFiltro] = useState<Filtro>('hoje')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // ── Ranges ──────────────────────────────────────────
  const { from, to } = useMemo(
    () => getRange(filtro, customFrom, customTo),
    [filtro, customFrom, customTo]
  )
  const compareRange = useMemo(
    () => getCompareRange(filtro, from, to),
    [filtro, from, to]
  )

  // ── Vendas filtradas ─────────────────────────────────
  const vendasPeriodo = useMemo(
    () => vendas.filter(v => { const d = new Date(v.created_at); return d >= from && d <= to }),
    [vendas, from, to]
  )
  const vendasCompare = useMemo(() => {
    if (!compareRange) return []
    return vendas.filter(v => {
      const d = new Date(v.created_at)
      return d >= compareRange.from && d <= compareRange.to
    })
  }, [vendas, compareRange])

  // ── KPIs ─────────────────────────────────────────────
  const kpis     = useMemo(() => calcKPIs(vendasPeriodo), [vendasPeriodo])
  const kpisComp = useMemo(() => calcKPIs(vendasCompare), [vendasCompare])
  const hasComp  = compareRange !== null

  // ── Chart: faturamento 30 dias (sempre 30d, independe do filtro) ──
  const chartLinha = useMemo(() => {
    const map: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      map[fmtShort(subDays(new Date(), i))] = 0
    }
    const from30 = startOf(subDays(new Date(), 29))
    vendas
      .filter(v => new Date(v.created_at) >= from30)
      .forEach(v => {
        const key = fmtShort(new Date(v.created_at))
        if (key in map) map[key] += v.total
      })
    return Object.entries(map).map(([data, valor]) => ({ data, valor }))
  }, [vendas])

  // ── Chart: ranking vendedores ───────────────────────
  const chartVendedores = useMemo(() => {
    const map: Record<string, { nome: string; total: number; qtd: number }> = {}
    vendasPeriodo.forEach(v => {
      if (!map[v.vendedor_id]) map[v.vendedor_id] = { nome: v.profiles?.nome ?? '—', total: 0, qtd: 0 }
      map[v.vendedor_id].total += v.total
      map[v.vendedor_id].qtd  += 1
    })
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(r => ({ nome: r.nome.split(' ')[0], total: r.total, qtd: r.qtd }))
  }, [vendasPeriodo])

  // ── Chart: top 10 produtos ──────────────────────────
  const chartProdutos = useMemo(() => {
    const map: Record<string, number> = {}
    vendasPeriodo.forEach(v =>
      v.venda_itens.forEach(i => {
        const nome = i.produtos?.nome ?? 'Produto'
        map[nome] = (map[nome] ?? 0) + i.qtd
      })
    )
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, qtd]) => ({
        nome: nome.split(' ').slice(0, 3).join(' '),
        qtd,
      }))
  }, [vendasPeriodo])

  // ── Chart: formas de pagamento ──────────────────────
  const chartPagamento = useMemo(() => {
    const map: Record<string, number> = {}
    vendasPeriodo.forEach(v => {
      map[v.forma_pagamento] = (map[v.forma_pagamento] ?? 0) + v.total
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
  }, [vendasPeriodo])

  // ── Clock ────────────────────────────────────────────
  const [clock, setClock] = useState('')
  useEffect(() => {
    const update = () => {
      const n = new Date()
      setClock(n.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return <DashboardSkeleton />

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'hoje',   label: 'Hoje'    },
    { key: 'ontem',  label: 'Ontem'   },
    { key: '7d',     label: '7 dias'  },
    { key: 'mes',    label: '30 dias' },
    { key: 'custom', label: 'Custom'  },
  ]

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="page-title text-3xl">Dashboard</h2>
          <p className="text-text-muted text-[11px] font-mono mt-0.5 tabular-nums">{clock}</p>
        </div>
        <div className="badge-purple shrink-0 mt-1">
          {kpis.total} vendas
        </div>
      </div>

      {/* ── Filtros ────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              filtro === f.key
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50'
                : 'bg-bg-elevated text-text-muted border border-white/5 hover:border-white/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filtro === 'custom' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="field-label">De</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input-field text-sm" />
          </div>
          <div className="flex-1">
            <label className="field-label">Até</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input-field text-sm" />
          </div>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Faturamento"
          value={kpis.faturamento}
          compare={hasComp ? kpisComp.faturamento : null}
          icon={<TrendingUp size={18} />}
          formatter={formatCurrency}
        />
        <KPICard
          label="Lucro Bruto"
          value={kpis.lucro}
          compare={hasComp ? kpisComp.lucro : null}
          icon={<DollarSign size={18} />}
          formatter={formatCurrency}
        />
        <KPICard
          label="Margem"
          value={kpis.margem}
          compare={hasComp ? kpisComp.margem : null}
          icon={<Percent size={18} />}
          formatter={n => n.toFixed(1)}
          suffix="%"
        />
        <KPICard
          label="Ticket Médio"
          value={kpis.ticketMedio}
          compare={hasComp ? kpisComp.ticketMedio : null}
          icon={<ShoppingBag size={18} />}
          formatter={formatCurrency}
        />
      </div>

      {/* ── Area: Faturamento 30 dias ──────────────── */}
      <div className="card">
        <p className="field-label mb-3">Faturamento · Últimos 30 dias</p>
        {chartLinha.every(d => d.valor === 0) ? (
          <div className="h-36 flex items-center justify-center text-text-muted text-sm">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartLinha} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                {/* fill: fade roxo → transparente */}
                <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#B026FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B026FF" stopOpacity={0}   />
                </linearGradient>
                {/* stroke: roxo → rosa neon */}
                <linearGradient id="gradStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#B026FF" />
                  <stop offset="100%" stopColor="#FF10F0" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="data"
                tick={{ fill: '#555', fontSize: 9 }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip content={<DarkTip />} />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="url(#gradStroke)"
                strokeWidth={2.5}
                fill="url(#gradFill)"
                dot={false}
                activeDot={{ fill: '#B026FF', r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Ranking Vendedores + Pagamentos ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Ranking vendedores */}
        <div className="card">
          <p className="field-label mb-3">Ranking Vendedores</p>
          {chartVendedores.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-text-muted text-sm">
              Sem vendas no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(130, chartVendedores.length * 38)}>
              <BarChart
                data={chartVendedores}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="nome" width={60}
                  tick={{ fill: '#a1a1a1', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }: any) =>
                    active && payload?.length ? (
                      <div className="bg-bg-elevated border border-neon-purple/30 rounded-xl px-3 py-2 text-xs">
                        <p className="text-text-muted mb-1">{label}</p>
                        <p className="font-mono text-neon-green">{formatCurrency(payload[0].value)}</p>
                        <p className="text-text-muted">{payload[0].payload.qtd} venda(s)</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {chartVendedores.map((_, i) => (
                    <Cell key={i} fill={CORES_BARS[i % CORES_BARS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Formas de pagamento */}
        <div className="card">
          <p className="field-label mb-3">Formas de Pagamento</p>
          {chartPagamento.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-text-muted text-sm">
              Sem vendas no período
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={chartPagamento}
                    cx="50%" cy="50%"
                    innerRadius={34} outerRadius={54}
                    dataKey="value" paddingAngle={3} strokeWidth={0}
                  >
                    {chartPagamento.map((_, i) => (
                      <Cell key={i} fill={CORES_NEON[i % CORES_NEON.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) =>
                      active && payload?.length ? (
                        <div className="bg-bg-elevated border border-neon-purple/30 rounded-xl px-3 py-2 text-xs">
                          <p className="text-text-muted mb-1">{payload[0].name}</p>
                          <p className="font-mono text-neon-green">{formatCurrency(payload[0].value)}</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2">
                {chartPagamento.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CORES_NEON[i % CORES_NEON.length] }} />
                    <span className="text-[10px] font-mono text-text-muted truncate">{entry.name}</span>
                    <span className="text-[10px] font-mono text-text-secondary ml-auto shrink-0">
                      {((entry.value / kpis.faturamento) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Top 10 Produtos ──────────────────────────── */}
      <div className="card">
        <p className="field-label mb-3">Top Produtos · Unidades vendidas</p>
        {chartProdutos.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-text-muted text-sm">
            Sem vendas no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, chartProdutos.length * 28)}>
            <BarChart
              data={chartProdutos}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="nome" width={100}
                tick={{ fill: '#a1a1a1', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<DarkTip currency={false} />} />
              <Bar dataKey="qtd" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {chartProdutos.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#B026FF' : '#39FF14'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Tabela: Últimas 20 vendas ─────────────────── */}
      <div className="card">
        <p className="field-label mb-3">Últimas 20 Vendas</p>
        {vendasPeriodo.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            Sem vendas no período selecionado
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-1 field-label">Vendedor</th>
                  <th className="text-center py-2 px-1 field-label">Itens</th>
                  <th className="text-right py-2 px-1 field-label">Total</th>
                  <th className="text-center py-2 px-1 field-label">Pgto</th>
                  <th className="text-right py-2 px-1 field-label">Hora</th>
                </tr>
              </thead>
              <tbody>
                {vendasPeriodo.slice(0, 20).map(v => (
                  <tr
                    key={v.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors"
                  >
                    <td className="py-2.5 px-1 text-text-primary max-w-[90px] truncate">
                      {v.profiles?.nome?.split(' ')[0] ?? '—'}
                    </td>
                    <td className="py-2.5 px-1 text-center font-mono text-text-secondary text-xs">
                      {v.venda_itens.reduce((s, i) => s + i.qtd, 0)}
                    </td>
                    <td className="py-2.5 px-1 text-right money text-sm whitespace-nowrap">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <span className={`${BADGE_PG[v.forma_pagamento] ?? 'badge'} text-[9px] whitespace-nowrap`}>
                        {v.forma_pagamento}
                      </span>
                    </td>
                    <td className="py-2.5 px-1 text-right font-mono text-text-muted text-xs whitespace-nowrap">
                      {new Date(v.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
