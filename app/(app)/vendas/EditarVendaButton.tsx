'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { editarVenda } from '@/lib/actions/vendas'
import type { FormaPagamento } from '@/lib/types'

const FORMAS: { value: FormaPagamento; label: string; emoji: string }[] = [
  { value: 'pix',      label: 'PIX',      emoji: '⚡' },
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'debito',   label: 'Débito',   emoji: '💳' },
  { value: 'credito',  label: 'Crédito',  emoji: '💎' },
]

interface Props {
  vendaId: string
  formaPagamento: FormaPagamento
  observacao: string | null
}

export function EditarVendaButton({ vendaId, formaPagamento, observacao }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [forma, setForma] = useState<FormaPagamento>(formaPagamento)
  const [obs, setObs] = useState(observacao ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function abrir() {
    // Reseta para valores atuais ao abrir
    setForma(formaPagamento)
    setObs(observacao ?? '')
    setErro(null)
    setAberto(true)
  }

  function cancelar() {
    setAberto(false)
    setErro(null)
  }

  function salvar() {
    setErro(null)
    startTransition(async () => {
      const { error } = await editarVenda(vendaId, { forma_pagamento: forma, observacao: obs })
      if (error) {
        setErro(error)
      } else {
        setAberto(false)
        router.refresh()
      }
    })
  }

  const mudou = forma !== formaPagamento || obs.trim() !== (observacao ?? '').trim()

  return (
    <div className="w-full">
      {/* Botão lápis — só visível quando fechado */}
      {!aberto && (
        <button
          onClick={abrir}
          title="Editar venda"
          className="w-7 h-7 rounded-lg bg-bg-overlay border border-white/10 flex items-center justify-center
                     text-text-muted hover:border-neon-purple/40 hover:text-neon-purple hover:bg-neon-purple/10
                     transition-all active:scale-90"
        >
          <Pencil size={12} />
        </button>
      )}

      {/* Formulário inline animado */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden w-full"
          >
            <div className="mt-3 pt-3 border-t border-white/10 space-y-3">

              {/* Forma de pagamento */}
              <div>
                <p className="field-label mb-1.5">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FORMAS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setForma(f.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono
                                  transition-all active:scale-95 ${
                        forma === f.value
                          ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple font-bold'
                          : 'bg-bg-overlay border-white/10 text-text-muted hover:border-white/20'
                      }`}
                    >
                      <span>{f.emoji}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observação */}
              <div>
                <p className="field-label mb-1.5">Observação</p>
                <input
                  type="text"
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Opcional..."
                  maxLength={200}
                  className="input-field text-sm py-2"
                />
              </div>

              {/* Erro */}
              {erro && (
                <p className="text-red-400 text-xs font-mono">{erro}</p>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={salvar}
                  disabled={isPending || !mudou}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                             bg-neon-purple/20 border border-neon-purple/40 text-neon-purple
                             text-xs font-semibold hover:bg-neon-purple/30 active:scale-95
                             transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={13} />
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={cancelar}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                             bg-bg-overlay border border-white/10 text-text-muted
                             text-xs font-semibold hover:border-white/20 active:scale-95
                             transition-all disabled:opacity-40"
                >
                  <X size={13} />
                  Cancelar
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
