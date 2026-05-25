'use client'

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Filter, ChevronDown, ChevronUp,
  Loader2, ClipboardList, Receipt, Download,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { DeleteVendaButton } from './DeleteVendaButton'

// ── Tipos ────────────────────────────────────────────────────────────────
type FormaPagamento = 'pix' | 'dinheiro' | 'debito' | 'credito'

interface ItemVenda {
  id: string
  qtd: number
  preco_unitario: number
  produtos: { id: string; nome: string; sku: string } | null
}

interface VendaRow {
  id: string
  total: number
  desconto: number
  forma_pagamento: FormaPagamento
  observacao: string | null
  created_at: string
  profiles: { id: string; nome: string } | null
  venda_itens: ItemVenda[]
}

interface Vendedor { id: string; nome: string }

interface FiltrosAtivos {
  periodo: string
  inicio: string
  fim: string
  pagamento: FormaPagamento[]
  vendedor: string
}

interface Props {
  vendas: VendaRow[]
  isAdmin: boolean
  vendedores: Vendedor[]
  filtrosAtivos: FiltrosAtivos
}

// ── Constantes ────────────────────────────────────────────────────────────
const FORMAS: { value: FormaPagamento; label: string; emoji: string }[] = [
  { value: 'pix',      label: 'PIX',      emoji: '⚡' },
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'debito',   label: 'Débito',   emoji: '💳' },
  { value: 'credito',  label: 'Crédito',  emoji: '💎' },
]

const BADGE: Record<FormaPagamento, string> = {
  pix:      'bg-neon-purple/20 text-neon-purple  border-neon-purple/30',
  dinheiro: 'bg-yellow-500/20 text-yellow-400   border-yellow-500/30',
  credito:  'bg-blue-500/20   text-blue-400     border-blue-500/30',
  debito:   'bg-neon-green/20 text-neon-green   border-neon-green/30',
}

const PERIODOS = [
  { value: 'hoje',   label: 'Hoje'   },
  { value: 'ontem',  label: 'Ontem'  },
  { value: '7dias',  label: '7 dias' },
  { value: '30dias', label: '30 dias'},
]

const LS_KEY = 'psygang-filtros-vendas'

// ── CSV Export ────────────────────────────────────────────────────────────
function cell(v: string | number | null | undefined): string {
  const s = String(v ?? '').replace(/"/g, '""')
  return `"${s}"`
}

function exportarCSV(vendas: VendaRow[], nomeArquivo: string) {
  const BOM = '﻿' // UTF-8 BOM — Excel abre corretamente acentos

  const cabecalho = [
    'Data', 'Hora', 'Vendedor', 'Produto', 'SKU', 'Qtd',
    'Preço Unit.', 'Subtotal Item', 'Forma Pgto', 'Desconto Venda', 'Total Venda', 'Observação',
  ].map(cell).join(',')

  const linhas: string[] = []

  vendas.forEach(v => {
    const dt = new Date(v.created_at)
    const data = dt.toLocaleDateString('pt-BR')
    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const vendedor = v.profiles?.nome ?? ''

    if (v.venda_itens.length === 0) {
      // Venda sem itens — uma linha com campos de produto vazios
      linhas.push([
        cell(data), cell(hora), cell(vendedor),
        cell(''), cell(''), cell(''), cell(''), cell(''),
        cell(v.forma_pagamento.toUpperCase()),
        cell(v.desconto.toFixed(2).replace('.', ',')),
        cell(v.total.toFixed(2).replace('.', ',')),
        cell(v.observacao ?? ''),
      ].join(','))
    } else {
      v.venda_itens.forEach((item, idx) => {
        const subtotal = item.qtd * item.preco_unitario
        linhas.push([
          cell(data), cell(hora), cell(vendedor),
          cell(item.produtos?.nome ?? ''),
          cell(item.produtos?.sku ?? ''),
          cell(item.qtd),
          cell(item.preco_unitario.toFixed(2).replace('.', ',')),
          cell(subtotal.toFixed(2).replace('.', ',')),
          // Forma pgto, desconto e total só na 1ª linha de cada venda
          idx === 0 ? cell(v.forma_pagamento.toUpperCase()) : cell(''),
          idx === 0 ? cell(v.desconto.toFixed(2).replace('.', ',')) : cell(''),
          idx === 0 ? cell(v.total.toFixed(2).replace('.', ','))    : cell(''),
          idx === 0 ? cell(v.observacao ?? '') : cell(''),
        ].join(','))
      })
    }
  })

  const csv = BOM + [cabecalho, ...linhas].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

// ── Componente principal ──────────────────────────────────────────────────
export default function VendasClient({
  vendas, isAdmin, vendedores, filtrosAtivos,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Estado dos filtros — inicializado via URL (props)
  const [periodo,    setPeriodo]    = useState(filtrosAtivos.periodo)
  const [inicio,     setInicio]     = useState(filtrosAtivos.inicio)
  const [fim,        setFim]        = useState(filtrosAtivos.fim)
  const [pagamentos, setPagamentos] = useState<FormaPagamento[]>(filtrosAtivos.pagamento)
  const [vendedor,   setVendedor]   = useState(filtrosAtivos.vendedor || 'todos')
  const [busca,      setBusca]      = useState('')
  const [aberto,     setAberto]     = useState(true)

  // ── Restaurar localStorage se URL está limpa ────────────────────────────
  useEffect(() => {
    const temURL = !!(
      filtrosAtivos.periodo || filtrosAtivos.inicio || filtrosAtivos.fim ||
      filtrosAtivos.pagamento.length || (filtrosAtivos.vendedor && filtrosAtivos.vendedor !== 'todos')
    )
    if (temURL) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const f = JSON.parse(raw) as Record<string, any>
      const p = new URLSearchParams()
      if (f.periodo) { p.set('periodo', f.periodo) }
      else {
        if (f.inicio) p.set('inicio', f.inicio)
        if (f.fim)    p.set('fim',    f.fim)
      }
      if (f.pagamentos?.length > 0 && f.pagamentos.length < 4)
        p.set('pagamento', f.pagamentos.join(','))
      if (f.vendedor && f.vendedor !== 'todos')
        p.set('vendedor', f.vendedor)
      if (p.toString()) router.push(`/vendas?${p.toString()}`)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Aplicar filtros → push URL + salvar localStorage ───────────────────
  const aplicar = useCallback((s: {
    periodo: string; inicio: string; fim: string
    pagamentos: FormaPagamento[]; vendedor: string
  }) => {
    const p = new URLSearchParams()
    if (s.periodo) {
      p.set('periodo', s.periodo)
    } else {
      if (s.inicio) p.set('inicio', s.inicio)
      if (s.fim)    p.set('fim',    s.fim)
    }
    if (s.pagamentos.length > 0 && s.pagamentos.length < 4)
      p.set('pagamento', s.pagamentos.join(','))
    if (s.vendedor && s.vendedor !== 'todos')
      p.set('vendedor', s.vendedor)

    try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {}
    startTransition(() =>
      router.push(`/vendas${p.toString() ? '?' + p.toString() : ''}`)
    )
  }, [router])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function onPeriodo(p: string) {
    const novo = periodo === p ? '' : p  // toggle
    setPeriodo(novo); setInicio(''); setFim('')
    aplicar({ periodo: novo, inicio: '', fim: '', pagamentos, vendedor })
  }

  function onData(campo: 'inicio' | 'fim', val: string) {
    const novoInicio = campo === 'inicio' ? val : inicio
    const novoFim    = campo === 'fim'    ? val : fim
    if (campo === 'inicio') setInicio(val); else setFim(val)
    setPeriodo('')
    aplicar({ periodo: '', inicio: novoInicio, fim: novoFim, pagamentos, vendedor })
  }

  function onPagamento(forma: FormaPagamento) {
    const novo = pagamentos.includes(forma)
      ? pagamentos.filter(p => p !== forma)
      : [...pagamentos, forma]
    setPagamentos(novo)
    aplicar({ periodo, inicio, fim, pagamentos: novo, vendedor })
  }

  function onVendedor(v: string) {
    setVendedor(v)
    aplicar({ periodo, inicio, fim, pagamentos, vendedor: v })
  }

  function limpar() {
    setPeriodo(''); setInicio(''); setFim('')
    setPagamentos([]); setVendedor('todos'); setBusca('')
    try { localStorage.removeItem(LS_KEY) } catch {}
    startTransition(() => router.push('/vendas'))
  }

  const temFiltro = !!(periodo || inicio || fim || pagamentos.length || vendedor !== 'todos' || busca)

  // ── Busca client-side (produto/vendedor) ──────────────────────────────
  const exibidas = useMemo(() => {
    if (!busca.trim()) return vendas
    const t = busca.toLowerCase()
    return vendas.filter(v =>
      v.profiles?.nome?.toLowerCase().includes(t) ||
      v.venda_itens.some(i => i.produtos?.nome?.toLowerCase().includes(t))
    )
  }, [vendas, busca])

  const faturamentoTotal = useMemo(
    () => exibidas.reduce((acc, v) => acc + v.total, 0),
    [exibidas]
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="page-title text-2xl shrink-0">Histórico</h2>

        <div className="flex items-center gap-2">
          {/* Exportar CSV */}
          {exibidas.length > 0 && (
            <button
              onClick={() => {
                const hoje = new Date().toISOString().slice(0, 10)
                exportarCSV(exibidas, `psygang-vendas-${hoje}.csv`)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neon-green/30
                         bg-neon-green/10 text-neon-green text-xs font-mono
                         hover:bg-neon-green/20 active:scale-95 transition-all"
              title="Exportar CSV"
            >
              <Download size={11} />
              CSV
            </button>
          )}

          {/* Filtros */}
          <button
            onClick={() => setAberto(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all',
              aberto
                ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple'
                : 'bg-bg-overlay border-white/10 text-text-muted'
            )}
          >
            <Filter size={11} />
            Filtros
            {temFiltro && <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />}
            {aberto ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* ── Painel de filtros (accordion) ───────────────────────── */}
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            key="painel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card space-y-4">

              {/* Período rápido */}
              <div>
                <p className="field-label mb-2">Período</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PERIODOS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => onPeriodo(p.value)}
                      className={cn(
                        'py-2 rounded-xl border text-xs font-mono transition-all active:scale-95',
                        periodo === p.value
                          ? 'bg-neon-purple/25 border-neon-purple/50 text-neon-purple font-bold'
                          : 'bg-bg-overlay border-white/10 text-text-muted hover:border-white/20'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data personalizada */}
              <div className="grid grid-cols-2 gap-2">
                {(['inicio', 'fim'] as const).map(campo => (
                  <div key={campo}>
                    <p className="field-label mb-1">{campo === 'inicio' ? 'De' : 'Até'}</p>
                    <input
                      type="date"
                      value={campo === 'inicio' ? inicio : fim}
                      onChange={e => onData(campo, e.target.value)}
                      className="input-field text-sm py-2"
                    />
                  </div>
                ))}
              </div>

              {/* Forma de pagamento (multi-check) */}
              <div>
                <p className="field-label mb-2">
                  Pagamento
                  {pagamentos.length > 0 && (
                    <span className="ml-2 text-neon-purple font-mono normal-case font-normal text-[11px]">
                      {pagamentos.length}/{FORMAS.length} selecionados
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FORMAS.map(fp => {
                    const ativo = pagamentos.includes(fp.value)
                    return (
                      <button
                        key={fp.value}
                        onClick={() => onPagamento(fp.value)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all active:scale-95',
                          ativo
                            ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                            : 'bg-bg-overlay border-white/10 text-text-muted hover:border-white/20'
                        )}
                      >
                        {/* Checkbox custom */}
                        <span className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                          ativo ? 'bg-neon-purple border-neon-purple' : 'border-white/20'
                        )}>
                          {ativo && (
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <path d="M1.5 4.5l2 2L7.5 2" stroke="white"
                                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span>{fp.emoji} {fp.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Vendedor (admin only) */}
              {isAdmin && (
                <div>
                  <p className="field-label mb-1">Vendedor</p>
                  <div className="relative">
                    <select
                      value={vendedor}
                      onChange={e => onVendedor(e.target.value)}
                      className="input-field text-sm appearance-none pr-8"
                    >
                      <option value="todos">Todos os vendedores</option>
                      {vendedores.map(v => (
                        <option key={v.id} value={v.id}>{v.nome}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>
                </div>
              )}

              {/* Busca rápida (client-side) */}
              <div>
                <p className="field-label mb-1">Busca rápida</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Produto ou vendedor..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="input-field pl-9 pr-8 text-sm py-2.5"
                  />
                  {busca && (
                    <button
                      onClick={() => setBusca('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Limpar */}
              {temFiltro && (
                <button
                  onClick={limpar}
                  className="w-full py-2 rounded-xl border border-red-500/20 text-red-400/60
                             hover:border-red-500/40 hover:text-red-400 text-xs font-mono
                             transition-all active:scale-98"
                >
                  Limpar todos os filtros
                </button>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contador + Faturamento filtrado ─────────────────────── */}
      <div className="flex items-center justify-between min-h-[22px]">
        {isPending ? (
          <span className="flex items-center gap-1.5 text-text-muted">
            <Loader2 size={12} className="animate-spin text-neon-purple" />
            <span className="text-xs font-mono">Buscando...</span>
          </span>
        ) : (
          <span className="text-text-muted text-xs font-mono">
            {exibidas.length === vendas.length
              ? `${vendas.length} venda${vendas.length !== 1 ? 's' : ''}`
              : `Mostrando ${exibidas.length} de ${vendas.length}`
            }
          </span>
        )}
        {faturamentoTotal > 0 && (
          <span className="money text-base">{formatCurrency(faturamentoTotal)}</span>
        )}
      </div>

      {/* ── Lista de vendas ──────────────────────────────────────── */}
      {exibidas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-text-muted"
        >
          <ClipboardList size={44} className="mx-auto mb-3 opacity-25" />
          <p className="font-medium">Nenhuma venda neste período</p>
          {temFiltro && (
            <button onClick={limpar} className="mt-3 text-neon-purple text-sm hover:underline">
              Limpar filtros
            </button>
          )}
        </motion.div>
      ) : (
        <div className={cn(
          'space-y-3 transition-opacity duration-200',
          isPending && 'opacity-50 pointer-events-none'
        )}>
          {exibidas.map((venda, i) => (
            <motion.div
              key={venda.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.16) }}
              className="card space-y-2"
            >
              {/* Linha principal */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium leading-tight">
                    {venda.profiles?.nome ?? '—'}
                  </p>
                  <p className="text-text-muted text-xs font-mono">{formatDate(venda.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="money text-lg">{formatCurrency(venda.total)}</p>
                  {venda.desconto > 0 && (
                    <p className="text-neon-pink text-xs font-mono">-{formatCurrency(venda.desconto)}</p>
                  )}
                </div>
                <DeleteVendaButton vendaId={venda.id} total={venda.total} />
              </div>

              {/* Itens */}
              <div className="space-y-0.5">
                {venda.venda_itens.map((item, j) => (
                  <div key={j} className="flex justify-between text-xs text-text-muted">
                    <span className="truncate pr-2">
                      {item.qtd}× {item.produtos?.nome ?? 'Produto'}
                    </span>
                    <span className="font-mono shrink-0">
                      {formatCurrency(item.preco_unitario * item.qtd)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer: badge pagamento + obs + link recibo */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold uppercase',
                  BADGE[venda.forma_pagamento] ?? 'bg-white/10 text-text-muted border-white/10'
                )}>
                  {FORMAS.find(f => f.value === venda.forma_pagamento)?.emoji}
                  {venda.forma_pagamento}
                </span>

                {venda.observacao && (
                  <span className="text-text-muted text-xs italic truncate max-w-[38%]">
                    {venda.observacao}
                  </span>
                )}

                <button
                  onClick={() => router.push(`/recibo/${venda.id}`)}
                  className="ml-auto flex items-center gap-1 text-[11px] text-text-muted
                             hover:text-neon-purple transition-colors font-mono"
                >
                  <Receipt size={11} />
                  recibo
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  )
}
