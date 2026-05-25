'use client'

import { create } from 'zustand'
import type { CarrinhoItem, FormaPagamento, Produto } from '@/lib/types'

interface CarrinhoStore {
  itens: CarrinhoItem[]
  desconto: number
  formaPagamento: FormaPagamento | ''
  observacao: string

  // Actions
  addItem: (produto: Produto) => void
  removeItem: (produtoId: string) => void
  updateQtd: (produtoId: string, qtd: number) => void
  setDesconto: (desconto: number) => void
  setFormaPagamento: (forma: FormaPagamento) => void
  setObservacao: (obs: string) => void
  limpar: () => void

  // Computed
  subtotal: () => number
  total: () => number
}

export const useCarrinho = create<CarrinhoStore>((set, get) => ({
  itens: [],
  desconto: 0,
  formaPagamento: '',
  observacao: '',

  addItem: (produto) => {
    const itens = get().itens
    const existing = itens.find((i) => i.produto.id === produto.id)
    if (existing) {
      set({
        itens: itens.map((i) =>
          i.produto.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i
        ),
      })
    } else {
      set({ itens: [...itens, { produto, qtd: 1 }] })
    }
  },

  removeItem: (produtoId) =>
    set({ itens: get().itens.filter((i) => i.produto.id !== produtoId) }),

  updateQtd: (produtoId, qtd) => {
    if (qtd <= 0) {
      get().removeItem(produtoId)
      return
    }
    set({
      itens: get().itens.map((i) =>
        i.produto.id === produtoId ? { ...i, qtd } : i
      ),
    })
  },

  setDesconto: (desconto) => set({ desconto }),
  setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
  setObservacao: (observacao) => set({ observacao }),

  limpar: () =>
    set({ itens: [], desconto: 0, formaPagamento: '', observacao: '' }),

  subtotal: () =>
    get().itens.reduce((acc, i) => acc + i.produto.preco_venda * i.qtd, 0),

  total: () => get().subtotal() - get().desconto,
}))
