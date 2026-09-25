'use client'

import { MapPin } from 'lucide-react'
import type { PontoVenda } from '@/lib/types'

interface Props {
  pontos: PontoVenda[]
  valor: string | null
  onChange: (id: string) => void
}

/** Primeira escolha do aparelho: bloqueia a venda até escolher */
export function EscolhaPontoVenda({ pontos, onChange }: Omit<Props, 'valor'>) {
  return (
    <div className="card space-y-4 text-center">
      <MapPin size={32} className="mx-auto text-neon-purple" />
      <div>
        <h3 className="font-display text-xl uppercase tracking-wide text-text-primary">
          Onde você está vendendo?
        </h3>
        <p className="text-text-muted text-sm mt-1">
          Fica salvo neste aparelho. Dá pra trocar depois no topo da tela.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {pontos.map(p => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className="p-4 rounded-xl border border-neon-purple/40 bg-neon-purple/10 text-neon-purple font-display uppercase tracking-wide active:scale-95 transition-transform"
          >
            {p.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Seletor compacto, sempre visível no topo da Nova Venda */
export function SeletorPontoVenda({ pontos, valor, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <MapPin size={14} className="text-neon-purple shrink-0" />
      <div className="flex bg-bg-overlay rounded-xl border border-white/10 p-0.5 flex-1">
        {pontos.map(p => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              valor === p.id
                ? 'bg-neon-purple/30 text-neon-purple border border-neon-purple/40'
                : 'text-text-muted'
            }`}
          >
            {p.nome}
          </button>
        ))}
      </div>
    </div>
  )
}
