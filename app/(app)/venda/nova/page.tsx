'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Minus, Trash2, ShoppingBag, X, CheckCircle, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCarrinho } from '@/lib/stores/carrinho'
import { criarVenda } from '@/lib/actions/vendas'
import { formatCurrency } from '@/lib/utils'
import type { Produto, FormaPagamento } from '@/lib/types'

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; icon: string }[] = [
  { value: 'pix', label: 'PIX', icon: '⚡' },
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'debito', label: 'Débito', icon: '💳' },
  { value: 'credito', label: 'Crédito', icon: '💎' },
]

export default function NovaVendaPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [descontoInput, setDescontoInput] = useState('')

  const {
    itens, addItem, removeItem, updateQtd,
    desconto, setDesconto, formaPagamento, setFormaPagamento,
    observacao, setObservacao, limpar, subtotal, total
  } = useCarrinho()

  const buscarProdutos = useCallback(async (termo: string) => {
    const supabase = createClient()
    let query = supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .gt('estoque', 0)
      .order('nome')
      .limit(20)

    if (termo) {
      query = query.ilike('nome', `%${termo}%`)
    }

    const { data } = await query
    setProdutos(data ?? [])
  }, [])

  useEffect(() => {
    buscarProdutos(busca)
  }, [busca, buscarProdutos])

  async function fecharVenda() {
    if (itens.length === 0) return setErro('Adicione produtos ao carrinho')
    if (!formaPagamento) return setErro('Selecione a forma de pagamento')
    if (total() < 0) return setErro('Desconto maior que o total')

    setLoading(true)
    setErro(null)

    const { data, error } = await criarVenda({
      forma_pagamento: formaPagamento as FormaPagamento,
      desconto,
      observacao,
      itens: itens.map(i => ({
        produto_id: i.produto.id,
        qtd: i.qtd,
        preco_unitario: i.produto.preco_venda,
        custo_unitario: i.produto.custo,
      })),
    })

    if (error) {
      setErro(error)
      setLoading(false)
      return
    }

    setSucesso(true)
    limpar()
    await buscarProdutos('')
    setLoading(false)

    setTimeout(() => {
      setSucesso(false)
    }, 3000)
  }

  const totalItens = itens.reduce((acc, i) => acc + i.qtd, 0)

  return (
    <div className="space-y-4">
      {/* Sucesso */}
      <AnimatePresence>
        {sucesso && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <div className="bg-neon-green/20 border border-neon-green/50 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="text-neon-green shrink-0" size={24} />
              <div>
                <p className="font-display text-neon-green uppercase tracking-wide">Venda fechada!</p>
                <p className="text-text-secondary text-sm">Total: {formatCurrency(total())}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Busca de produtos */}
      <div>
        <h2 className="page-title text-2xl mb-3">Nova Venda</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-10"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-2 gap-2">
        {produtos.map(produto => (
          <motion.button
            key={produto.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => addItem(produto)}
            className="card-hover text-left p-3 space-y-1"
          >
            <p className="text-text-primary text-sm font-medium leading-tight line-clamp-2">
              {produto.nome}
            </p>
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
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Carrinho */}
      {itens.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg uppercase tracking-wide text-text-primary">
              Carrinho ({totalItens})
            </h3>
            <button
              onClick={limpar}
              className="text-text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {itens.map(item => (
              <motion.div
                key={item.produto.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm truncate">{item.produto.nome}</p>
                  <p className="money text-sm">{formatCurrency(item.produto.preco_venda * item.qtd)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQtd(item.produto.id, item.qtd - 1)}
                    className="w-7 h-7 rounded-full bg-bg-overlay border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus size={12} className="text-text-secondary" />
                  </button>
                  <span className="font-mono text-text-primary w-6 text-center text-sm">{item.qtd}</span>
                  <button
                    onClick={() => updateQtd(item.produto.id, item.qtd + 1)}
                    className="w-7 h-7 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus size={12} className="text-neon-purple" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desconto */}
          <div>
            <label className="field-label">Desconto (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={descontoInput}
              onChange={e => {
                setDescontoInput(e.target.value)
                setDesconto(parseFloat(e.target.value) || 0)
              }}
              className="input-field"
              min="0"
              max={subtotal()}
            />
          </div>

          {/* Totais */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subtotal</span>
              <span className="font-mono text-text-secondary">{formatCurrency(subtotal())}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Desconto</span>
                <span className="font-mono text-red-400">-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-primary font-medium">Total</span>
              <span className="money text-xl">{formatCurrency(total())}</span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="field-label">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map(fp => (
                <button
                  key={fp.value}
                  onClick={() => setFormaPagamento(fp.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                    formaPagamento === fp.value
                      ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                      : 'bg-bg-overlay border-white/10 text-text-secondary hover:border-white/20'
                  }`}
                >
                  <span className="mr-1">{fp.icon}</span>
                  {fp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="field-label">Observação (opcional)</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Alguma observação..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}
        </div>
      )}

      {/* Botão Fechar Venda */}
      {itens.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={fecharVenda}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 sticky bottom-24 shadow-neon-purple"
        >
          {loading ? (
            <span className="animate-pulse">Processando...</span>
          ) : (
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

