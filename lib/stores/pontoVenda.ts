'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'

// localStorage pode lançar (aba anônima, dados bloqueados) — nesse caso
// o seletor só não é lembrado, e o vendedor escolhe de novo.
const storageSeguro: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignora */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignora */ } },
}

interface PontoVendaStore {
  pontoVendaId: string | null
  setPontoVendaId: (id: string | null) => void
}

/** Ponto de venda do aparelho — o celular da barraca fica sempre em "Barraca" */
export const usePontoVenda = create<PontoVendaStore>()(
  persist(
    (set) => ({
      pontoVendaId: null,
      setPontoVendaId: (pontoVendaId) => set({ pontoVendaId }),
    }),
    { name: 'psygang-ponto-venda', storage: createJSONStorage(() => storageSeguro) },
  ),
)
