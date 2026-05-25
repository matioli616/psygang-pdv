'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Minus, Trash2, ShoppingBag,
  X, Tag, Percent, DollarSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCarrinho } from '@/lib/stores/carrinho'
import { criarVenda, validarCupon } from '@/lib/actions/vendas'
import { formatCurrency } from '@/lib/utils'
import type { FormaPagamento, Produto } from '@/lib/types'

const FORMAS: { value: FormaPagamento; label: string; emoji: string }[] = [
  { value: 'pix',      label: 'PIX',      emoji: '⚡' },
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'debito',   label: 'Débito',   emoji: '💳' },
  { value: 'credito',  label: 'Crédito',  emoji: '💎' },
]

export default function NovaVendaPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Cupom UI
  const [cuponInput, setCuponInput] = useState('')
  const [cuponLoading, setCuponLoading] = useState(false)
  const [cuponErro, setCuponErro] = useState<string | null>(null)

  // Item expandido para desconto
  const [itemExpandido, setItemExpandido] = useState<string | null>(null)

  const {
    itens, addItem, removeItem, updateQtd, setDescontoItem,
    descontoTipo, descontoValor, setDescontoTipo, setDescontoValor,
    cupon, setCupon,
    formaPagamento, setFormaPagamento,
    observacao, setObservacao,
    limpar,
    subtotalBruto, descontoItens, descontoVendaRS, descontoCupon, totalDesconto, total,
  } = useCarrinho()

  // ── Busca produtos ──────────────────────────────────
  const buscarProdutos = useCallback(async (termo: string) => {
    const supabase = createClient()
    let q = supabase.from('produtos').select('*').eq('ativo', true).gt('estoque', 0).order('nome').limit(20)
    if (termo) q = q.ilike('nome', `%${termo}%`)
    const { data } = await q
    setProdutos(data ?? [])
  }, [])

  useEffect(() => { buscarProdutos(busca) }, [busca, buscarProdutos])

  // ── Aplicar cupom ────────────────────────────────────
  async function aplicarCupon() {
    if (!cuponInput.trim()) return
    setCuponLoading(true)
    setCuponErro(null)

    const { data, error } = await validarCupon(cuponInput)

    if (error || !data) {
      setCuponErro(error ?? 'Cupom inválido')
      setCuponLoading(false)
      return
    }

    // Calcula valor R$ do cupom sobre o subtotal após descontos de item
    const base = subtotalBruto() - descontoItens()
    const valorRS = data.tipo === 'percentual'
      ? Math.round(base * (data.valor / 100) * 100) / 100
      : data.valor

    setCupon({ id: data.id, codigo: cuponInput.toUpperCase().trim(), tipo: data.tipo as any, valor: data.valor, valorDesconto: valorRS })
    setCuponLoading(false)
  }

  function removerCupon() {
    setCupon(null)
    setCuponInput('')
    setCuponErro(null)
  }

  // ── Fechar venda ──────────────────────────────────────
  async function fecharVenda() {
    if (itens.length === 0)     return setErro('Adicione produtos ao carrinho')
    if (!formaPagamento)        return setErro('Selecione a forma de pagamento')
    if (total() < 0)            return setErro('Desconto maior que o total')

    setLoading(true)
    setErro(null)

    const { data, error } = await criarVenda({
      forma_pagamento: formaPagamento as FormaPagamento,
      desconto:        descontoVendaRS(),  // só o desconto manual da venda
      observacao,
      cupon_id:        cupon?.id ?? null,
      itens: itens.map(i => ({
        produto_id:     i.produto.id,
        qtd:            i.qtd,
        preco_unitario: i.produto.preco_venda,
        custo_unitario: i.produto.custo,
        desconto_item:  i.desconto_item,
      })),
    })

    if (error) { setErro(error); setLoading(false); return }

    limpar()
    router.push(`/recibo/${data!.venda_id}`)
  }

  const totalItens = itens.reduce((acc, i) => acc + i.qtd, 0)
  const temDesconto = totalDesconto() > 0

  return (
    <div className="space-y-4">

      {/* Header + busca */}
      <div>
        <h2 className="page-title text-2xl mb-3">Nova Venda</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" placeholder="Buscar produto..." value={busca}
            onChange={e => setBusca(e.target.value)} className="input-field pl-10 pr-10"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Grid produtos */}
      <div className="grid grid-cols-2 gap-2">
        {produtos.map(produto => (
          <motion.button key={produto.id} whileTap={{ scale: 0.97 }}
            onClick={() => addItem(produto)} className="card-hover text-left p-3 space-y-1"
          >
            <p className="text-text-primary text-sm font-medium leading-tight line-clamp-2">{produto.nome}</p>
            <p className="money text-base">{formatCurrency(produto.preco_venda)}</p>
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-xs">Estoque: {produto.estoque}</p>
              <div className="w-6 h-6 rounded-full bg-neon-purple/20 flex items-center justify-center">
                <Plus size={12} className="text-neon-purple" />
              </div>
            </div>
          </motion.button>
        ))}
        {produtos.length === 0 && (
          <div className="col-span-2 text-center py-8 text-text-muted">
            <ShoppingBag size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          CARRINHO + DESCONTOS
          ═══════════════════════════════════════ */}
      {itens.length > 0 && (
        <div className="card space-y-4">

          {/* Header carrinho */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg uppercase tracking-wide">
              Carrinho <span className="text-neon-purple">({totalItens})</span>
            </h3>
            <button onClick={limpar} className="text-text-muted hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>

          {/* ── Itens ── */}
          <div className="space-y-1">
            <AnimatePresence>
              {itens.map(item => (
                <motion.div key={item.produto.id} layout
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                >
                  {/* Linha do item */}
                  <div className="flex items-center gap-2 py-2 border-b border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{item.produto.nome}</p>
                      <div className="flex items-center gap-2">
                        <p className="money text-sm">
                          {formatCurrency((item.produto.preco_venda * item.qtd) - item.desconto_item)}
                        </p>
                        {item.desconto_item > 0 && (
                          <span className="text-red-400 text-xs font-mono line-through">
                            {formatCurrency(item.produto.preco_venda * item.qtd)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qtd +/- */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQtd(item.produto.id, item.qtd - 1)}
                        className="w-7 h-7 rounded-full bg-bg-overlay border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
                        <Minus size={12} className="text-text-secondary" />
                      </button>
                      <span className="font-mono text-text-primary w-5 text-center text-sm">{item.qtd}</span>
                      <button onClick={() => updateQtd(item.produto.id, item.qtd + 1)}
                        className="w-7 h-7 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center active:scale-90 transition-transform">
                        <Plus size={12} className="text-neon-purple" />
                      </button>
                    </div>

                    {/* Toggle desconto item */}
                    <button
                      onClick={() => setItemExpandido(itemExpandido === item.produto.id ? null : item.produto.id)}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                        item.desconto_item > 0
                          ? 'bg-neon-pink/20 border-neon-pink/50 text-neon-pink'
                          : 'bg-bg-overlay border-white/10 text-text-muted hover:border-white/20'
                      }`}
                    >
                      <Tag size={12} />
                    </button>
                  </div>

                  {/* Desconto por item (expandido) */}
                  <AnimatePresence>
                    {itemExpandido === item.produto.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="py-2 pb-3 px-1 bg-bg-overlay/50 rounded-xl mt-1 flex items-center gap-2">
                          <Tag size={14} className="text-neon-pink shrink-0" />
                          <div className="flex-1">
                            <label className="field-label">Desconto neste item (R$)</label>
                            <input
                              type="number" inputMode="decimal" placeholder="0,00"
                              min="0" max={item.produto.preco_venda * item.qtd}
                              value={item.desconto_item || ''}
                              onChange={e => setDescontoItem(item.produto.id, parseFloat(e.target.value) || 0)}
                              className="input-field py-2 text-sm"
                            />
                          </div>
                          {item.desconto_item > 0 && (
                            <button onClick={() => setDescontoItem(item.produto.id, 0)}
                              className="text-text-muted hover:text-red-400 transition-colors mt-3">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Desconto da venda (R$ ou %) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="field-label">Desconto na venda</label>
              {/* Toggle R$ / % */}
              <div className="flex bg-bg-overlay rounded-xl border border-white/10 p-0.5">
                {(['fixo', 'percentual'] as const).map(tipo => (
                  <button key={tipo}
                    onClick={() => setDescontoTipo(tipo)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      descontoTipo === tipo
                        ? 'bg-neon-purple/30 text-neon-purple border border-neon-purple/40'
                        : 'text-text-muted'
                    }`}
                  >
                    {tipo === 'fixo' ? <DollarSign size={11} /> : <Percent size={11} />}
                    {tipo === 'fixo' ? 'R$' : '%'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                type="number" inputMode="decimal"
                placeholder={descontoTipo === 'fixo' ? '0,00' : '0'}
                min="0" max={descontoTipo === 'fixo' ? subtotalBruto() - descontoItens() : 100}
                value={descontoValor || ''}
                onChange={e => setDescontoValor(parseFloat(e.target.value) || 0)}
                className="input-field pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">
                {descontoTipo === 'fixo' ? 'R$' : '%'}
                {descontoVendaRS() > 0 && descontoTipo === 'percentual' && (
                  <span className="ml-1 text-neon-pink text-xs">= {formatCurrency(descontoVendaRS())}</span>
                )}
              </span>
            </div>
          </div>

          {/* ── Cupom ── */}
          <div className="space-y-2">
            <label className="field-label flex items-center gap-1.5">
              <Tag size={11} /> Cupom de desconto
            </label>

            {cupon ? (
              /* Cupom aplicado */
              <div className="flex items-center justify-between bg-neon-green/10 border border-neon-green/30 rounded-xl px-4 py-3">
                <div>
                  <p className="text-neon-green font-mono text-sm font-bold">{cupon.codigo}</p>
                  <p className="text-text-muted text-xs">
                    {cupon.tipo === 'percentual' ? `${cupon.valor}% off` : `R$ ${cupon.valor} off`}
                    {' · '}economia de <span className="text-neon-green">{formatCurrency(cupon.valorDesconto)}</span>
                  </p>
                </div>
                <button onClick={removerCupon} className="text-text-muted hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              /* Input cupom */
              <div className="flex gap-2">
                <input
                  type="text" placeholder="CÓDIGO DO CUPOM"
                  value={cuponInput}
                  onChange={e => { setCuponInput(e.target.value.toUpperCase()); setCuponErro(null) }}
                  onKeyDown={e => e.key === 'Enter' && aplicarCupon()}
                  className="input-field flex-1 font-mono uppercase text-sm tracking-wider"
                />
                <button
                  onClick={aplicarCupon}
                  disabled={cuponLoading || !cuponInput.trim()}
                  className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40"
                >
                  {cuponLoading ? '...' : 'Aplicar'}
                </button>
              </div>
            )}

            {cuponErro && (
              <p className="text-red-400 text-xs font-mono">{cuponErro}</p>
            )}
          </div>

          {/* ── Resumo de descontos + Total ── */}
          <div className="space-y-1.5 border-t border-white/10 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-mono text-text-secondary">{formatCurrency(subtotalBruto())}</span>
            </div>

            {descontoItens() > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted flex items-center gap-1">
                  <Tag size={10} /> Desconto itens
                </span>
                <span className="font-mono text-neon-pink">-{formatCurrency(descontoItens())}</span>
              </div>
            )}

            {descontoVendaRS() > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">
                  Desconto venda {descontoTipo === 'percentual' ? `(${descontoValor}%)` : ''}
                </span>
                <span className="font-mono text-neon-pink">-{formatCurrency(descontoVendaRS())}</span>
              </div>
            )}

            {descontoCupon() > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted flex items-center gap-1">
                  <Tag size={10} /> {cupon?.codigo}
                </span>
                <span className="font-mono text-neon-green">-{formatCurrency(descontoCupon())}</span>
              </div>
            )}

            {temDesconto && (
              <div className="flex justify-between text-sm border-t border-white/5 pt-1.5">
                <span className="text-text-muted">Total descontos</span>
                <span className="font-mono text-neon-pink font-bold">-{formatCurrency(totalDesconto())}</span>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <span className="text-text-primary font-semibold">Total</span>
              <span className="money text-2xl">{formatCurrency(total())}</span>
            </div>
          </div>

          {/* ── Forma de pagamento ── */}
          <div>
            <label className="field-label mb-2 block">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS.map(fp => (
                <button key={fp.value} onClick={() => setFormaPagamento(fp.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                    formaPagamento === fp.value
                      ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                      : 'bg-bg-overlay border-white/10 text-text-secondary hover:border-white/20'
                  }`}
                >
                  <span className="mr-1">{fp.emoji}</span>{fp.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Observação ── */}
          <div>
            <label className="field-label">Observação (opcional)</label>
            <textarea
              value={observacao} onChange={e => setObservacao(e.target.value)}
              placeholder="Alguma observação..." rows={2} className="input-field resize-none"
            />
          </div>

          {/* ── Erro ── */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}
        </div>
      )}

      {/* Botão Fechar Venda */}
      {itens.length > 0 && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={fecharVenda} disabled={loading || isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 sticky bottom-24 shadow-neon-purple"
        >
          {loading ? <span className="animate-pulse">Processando...</span> : (
            <>
              <ShoppingBag size={20} />
              Fechar Venda · {formatCurrency(total())}
            </>
          )}
        </motion.button>
      )}
    </div>
  )
}
