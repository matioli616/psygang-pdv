'use client'

import { create } from 'zustand'
import type { CarrinhoItem, CupomAplicado, FormaPagamento, Produto, TipoDesconto } from '@/lib/types'

interface CarrinhoStore {
  itens: CarrinhoItem[]

  // Desconto da venda (R$ ou %)
  descontoTipo:  TipoDesconto
  descontoValor: number       // número digitado (pode ser % ou R$)

  // Cupom aplicado
  cupon: CupomAplicado | null

  formaPagamento: FormaPagamento | ''
  observacao: string

  // ── Actions ──────────────────────────────
  addItem:       (produto: Produto) => void
  removeItem:    (produtoId: string) => void
  updateQtd:     (produtoId: string, qtd: number) => void
  setDescontoItem: (produtoId: string, desconto: number) => void

  setDescontoTipo:  (tipo: TipoDesconto) => void
  setDescontoValor: (valor: number) => void
  setCupon:         (c: CupomAplicado | null) => void
  setFormaPagamento:(forma: FormaPagamento) => void
  setObservacao:    (obs: string) => void
  limpar: () => void

  // ── Computed ─────────────────────────────
  subtotalBruto:   () => number   // sem nenhum desconto
  descontoItens:   () => number   // soma dos desconto_item
  descontoVendaRS: () => number   // desconto da venda convertido em R$
  descontoCupon:   () => number   // R$ do cupom aplicado
  totalDesconto:   () => number   // soma de todos os descontos
  total:           () => number   // valor final
}

export const useCarrinho = create<CarrinhoStore>((set, get) => ({
  itens: [],
  descontoTipo: 'fixo',
  descontoValor: 0,
  cupon: null,
  formaPagamento: '',
  observacao: '',

  // ── Actions ──────────────────────────────

  addItem: (produto) => {
    const itens = get().itens
    const existing = itens.find(i => i.produto.id === produto.id)
    if (existing) {
      set({ itens: itens.map(i =>
        i.produto.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i
      )})
    } else {
      set({ itens: [...itens, { produto, qtd: 1, desconto_item: 0 }] })
    }
  },

  removeItem: (produtoId) =>
    set({ itens: get().itens.filter(i => i.produto.id !== produtoId) }),

  updateQtd: (produtoId, qtd) => {
    if (qtd <= 0) { get().removeItem(produtoId); return }
    set({ itens: get().itens.map(i =>
      i.produto.id === produtoId ? { ...i, qtd } : i
    )})
  },

  setDescontoItem: (produtoId, desconto) =>
    set({ itens: get().itens.map(i =>
      i.produto.id === produtoId ? { ...i, desconto_item: Math.max(0, desconto) } : i
    )}),

  setDescontoTipo:   (descontoTipo)  => set({ descontoTipo, descontoValor: 0 }),
  setDescontoValor:  (descontoValor) => set({ descontoValor }),
  setCupon:          (cupon)         => set({ cupon }),
  setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
  setObservacao:     (observacao)    => set({ observacao }),

  limpar: () => set({
    itens: [], descontoTipo: 'fixo', descontoValor: 0,
    cupon: null, formaPagamento: '', observacao: '',
  }),

  // ── Computed ─────────────────────────────

  subtotalBruto: () =>
    get().itens.reduce((acc, i) => acc + i.produto.preco_venda * i.qtd, 0),

  descontoItens: () =>
    get().itens.reduce((acc, i) => acc + i.desconto_item, 0),

  descontoVendaRS: () => {
    const { descontoTipo, descontoValor, subtotalBruto, descontoItens } = get()
    const base = subtotalBruto() - descontoItens()
    if (descontoTipo === 'percentual') {
      return Math.round(base * (descontoValor / 100) * 100) / 100
    }
    return descontoValor
  },

  descontoCupon: () => get().cupon?.valorDesconto ?? 0,

  totalDesconto: () => {
    const { descontoItens, descontoVendaRS, descontoCupon } = get()
    return descontoItens() + descontoVendaRS() + descontoCupon()
  },

  total: () => {
    const { subtotalBruto, totalDesconto } = get()
    return Math.max(0, subtotalBruto() - totalDesconto())
  },
}))
