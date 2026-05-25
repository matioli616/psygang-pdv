'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Printer, ShoppingBag, Check, Zap } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useCarrinho } from '@/lib/stores/carrinho'

// ── Count-up animado ────────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic

    const tick = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      setValue(target * ease(progress))
      if (progress < 1) requestAnimationFrame(tick)
      else setValue(target)
    }

    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, duration])

  return value
}

// ── Estilos de pagamento ────────────────────────────────────────
const PAG: Record<string, { bg: string; border: string; text: string; label: string; emoji: string }> = {
  pix:      { bg: 'bg-neon-purple/15', border: 'border-neon-purple/40', text: 'text-neon-purple', label: 'PIX',      emoji: '⚡' },
  dinheiro: { bg: 'bg-neon-green/15',  border: 'border-neon-green/40',  text: 'text-neon-green',  label: 'Dinheiro', emoji: '💵' },
  credito:  { bg: 'bg-blue-500/15',    border: 'border-blue-500/40',    text: 'text-blue-400',    label: 'Crédito',  emoji: '💎' },
  debito:   { bg: 'bg-yellow-500/15',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  label: 'Débito',   emoji: '💳' },
}

// ── Tipos ────────────────────────────────────────────────────────
interface ItemVenda {
  id: string
  qtd: number
  preco_unitario: number
  custo_unitario: number
  produtos: { id: string; nome: string; sku: string } | null
}

interface VendaComJoins {
  id: string
  total: number
  desconto: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
  profiles: { nome: string; role: string } | null
  venda_itens: ItemVenda[]
}

interface Props {
  venda: VendaComJoins
  numero: number
}

export default function ReciboClient({ venda, numero }: Props) {
  const router   = useRouter()
  const limpar   = useCarrinho(s => s.limpar)
  const [compartilhado, setCompartilhado] = useState(false)

  const animatedTotal = useCountUp(venda.total)
  const pag           = PAG[venda.forma_pagamento] ?? PAG.pix
  const numStr        = String(numero).padStart(4, '0')

  const subtotalBruto = venda.venda_itens.reduce(
    (acc, i) => acc + i.preco_unitario * i.qtd, 0
  )

  // ── Ações ────────────────────────────────────────────────────
  function novaVenda() {
    limpar()
    router.push('/venda/nova')
  }

  function compartilharWhatsApp() {
    const itensTexto = venda.venda_itens
      .map(i => `• ${i.qtd}x ${i.produtos?.nome ?? 'Produto'} — ${formatCurrency(i.preco_unitario * i.qtd)}`)
      .join('\n')

    const dataHora = new Date(venda.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const linhas = [
      `🛸 *PsyGang Vendas*`,
      `Venda #${numStr} — ${dataHora}`,
      ``,
      `📦 *Itens:*`,
      itensTexto,
      ``,
      venda.desconto > 0 ? `🔖 Desconto: -${formatCurrency(venda.desconto)}` : null,
      `${pag.emoji} *${pag.label}*`,
      `💰 *Total: ${formatCurrency(venda.total)}*`,
      venda.observacao ? `\n📝 ${venda.observacao}` : null,
    ].filter(Boolean).join('\n')

    window.open(`https://wa.me/?text=${encodeURIComponent(linhas)}`, '_blank')
    setCompartilhado(true)
    setTimeout(() => setCompartilhado(false), 3000)
  }

  function imprimir() {
    window.print()
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          nav, header { display: none !important; }
          .print-clean {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            background: #fff !important;
            color: #111 !important;
          }
          .print-clean * { color: inherit !important; }
          .print-total { color: #16a34a !important; }
          .print-muted { color: #666 !important; }
        }
      `}</style>

      <div className="space-y-3 pb-36">

        {/* ── Card principal ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="card print-clean"
        >

          {/* Cabeçalho / Logo */}
          <div className="text-center pb-4 border-b border-white/10">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.35 }}
            >
              <p className="font-display text-2xl text-neon-purple tracking-widest uppercase select-none">
                🛸 PsyGang
              </p>
              <p className="text-text-muted text-[10px] tracking-[0.2em] uppercase mt-0.5 print-muted">
                Comprovante de Venda
              </p>
            </motion.div>

            {/* Meta da venda */}
            <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-text-muted print-muted">
              <span className="text-neon-purple font-bold">#{numStr}</span>
              <span>{formatDate(venda.created_at)}</span>
            </div>

            <p className="text-text-secondary text-xs mt-1">
              Vendedor:{' '}
              <span className="text-text-primary font-semibold">
                {venda.profiles?.nome ?? '—'}
              </span>
            </p>
          </div>

          {/* ── Tabela de itens ─────────────────────── */}
          <div className="py-3">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_28px_auto_auto] gap-x-2 pb-1.5 border-b border-white/5
                            text-[10px] uppercase tracking-wider text-text-muted font-mono print-muted">
              <span>Produto</span>
              <span className="text-center">Qtd</span>
              <span className="text-right">Unit.</span>
              <span className="text-right">Total</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {venda.venda_itens.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.055, duration: 0.3 }}
                  className="grid grid-cols-[1fr_28px_auto_auto] gap-x-2 py-2.5 text-sm items-center"
                >
                  <span className="text-text-primary leading-tight line-clamp-2">
                    {item.produtos?.nome ?? 'Produto'}
                  </span>
                  <span className="text-text-muted font-mono text-center text-xs">
                    {item.qtd}
                  </span>
                  <span className="text-text-secondary font-mono text-right text-xs">
                    {formatCurrency(item.preco_unitario)}
                  </span>
                  <span className="text-text-primary font-mono text-right font-medium">
                    {formatCurrency(item.preco_unitario * item.qtd)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Resumo financeiro ───────────────────── */}
          <div className="space-y-2 border-t border-white/10 pt-3">

            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-text-muted print-muted">Subtotal</span>
              <span className="font-mono text-text-secondary">
                {formatCurrency(subtotalBruto)}
              </span>
            </div>

            {/* Desconto (se houver) */}
            {venda.desconto > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-between text-sm"
              >
                <span className="text-text-muted print-muted">Desconto</span>
                <span className="font-mono text-neon-pink font-medium">
                  -{formatCurrency(venda.desconto)}
                </span>
              </motion.div>
            )}

            {/* Total animado */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 20 }}
              className="flex items-center justify-between pt-2 border-t border-white/10"
            >
              <span className="text-text-primary font-bold uppercase tracking-wide text-sm">
                Total
              </span>
              <span className="font-mono text-3xl font-bold text-neon-green print-total tabular-nums">
                {formatCurrency(animatedTotal)}
              </span>
            </motion.div>
          </div>

          {/* ── Pagamento + Observação ──────────────── */}
          <div className="flex items-start justify-between gap-2 pt-3 mt-1 border-t border-white/5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold shrink-0
                          ${pag.bg} ${pag.border} ${pag.text}`}
            >
              <span aria-hidden>{pag.emoji}</span>
              {pag.label}
            </span>

            {venda.observacao && (
              <p className="text-text-muted text-xs italic text-right leading-relaxed">
                "{venda.observacao}"
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Botão Imprimir (linha separada) ──────── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          onClick={imprimir}
          className="no-print w-full flex items-center justify-center gap-2 py-2.5
                     rounded-xl border border-white/10 text-text-muted
                     hover:text-text-secondary hover:border-white/20 text-sm
                     transition-all active:scale-95"
        >
          <Printer size={15} />
          Imprimir recibo
        </motion.button>

      </div>

      {/* ── Botões fixos no bottom ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="no-print fixed bottom-20 left-0 right-0 px-4 z-30"
      >
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">

          {/* Nova Venda */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={novaVenda}
            className="btn-primary flex items-center justify-center gap-2 py-3.5 text-sm"
          >
            <ShoppingBag size={18} />
            Nova Venda
          </motion.button>

          {/* WhatsApp */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={compartilharWhatsApp}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border
                        font-semibold text-sm transition-all ${
              compartilhado
                ? 'bg-neon-green/20 border-neon-green/60 text-neon-green'
                : 'bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green/20'
            }`}
          >
            <AnimatePresence mode="wait">
              {compartilhado ? (
                <motion.span
                  key="ok"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={17} /> Enviado!
                </motion.span>
              ) : (
                <motion.span
                  key="share"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Share2 size={17} /> WhatsApp
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

        </div>
      </motion.div>
    </>
  )
}
