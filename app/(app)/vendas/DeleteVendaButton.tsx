'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { deletarVenda } from '@/lib/actions/vendas'

interface Props {
  vendaId: string
  total: number
}

export function DeleteVendaButton({ vendaId, total }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setErro(null)

    const { error } = await deletarVenda(vendaId)

    if (error) {
      setErro(error)
      setLoading(false)
      setConfirmando(false)
      return
    }

    // revalidatePath já cuida — mas router.refresh garante o update imediato no client
    router.refresh()
  }

  if (confirmando) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5"
        >
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Excluindo...</span>
            ) : (
              <>
                <Trash2 size={11} />
                Confirmar
              </>
            )}
          </button>
          {!loading && (
            <button
              onClick={() => setConfirmando(false)}
              className="px-2.5 py-1 rounded-lg bg-bg-overlay border border-white/10 text-text-muted text-xs transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setConfirmando(true)}
        title="Excluir venda"
        className="w-7 h-7 rounded-lg bg-bg-overlay border border-white/10 flex items-center justify-center text-text-muted hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
      >
        <Trash2 size={13} />
      </button>
      {erro && (
        <p className="text-red-400 text-xs font-mono max-w-[120px]">{erro}</p>
      )}
    </div>
  )
}
