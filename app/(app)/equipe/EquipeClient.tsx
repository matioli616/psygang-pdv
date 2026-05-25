'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit2, X, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import { atualizarMembro, toggleAtivoMembro } from '@/lib/actions/equipe'
import { formatCurrency } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const schema = z.object({
  nome: z.string().min(2),
  role: z.enum(['admin', 'vendedor']),
  comissao_pct: z.coerce.number().min(0).max(100),
})
type FormData = z.infer<typeof schema>

export default function EquipeClient({
  profiles,
  faturamentoPorVendedor,
}: {
  profiles: Profile[]
  faturamentoPorVendedor: Record<string, number>
}) {
  const [lista, setLista] = useState(profiles)
  const [editando, setEditando] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function abrirModal(profile: Profile) {
    setEditando(profile)
    reset({ nome: profile.nome, role: profile.role, comissao_pct: profile.comissao_pct })
  }

  async function onSubmit(data: FormData) {
    if (!editando) return
    setLoading(true)
    const { error } = await atualizarMembro({ id: editando.id, ...data })
    if (!error) {
      setLista(l => l.map(p => p.id === editando.id ? { ...p, ...data } : p))
      setEditando(null)
    }
    setLoading(false)
  }

  async function toggleAtivo(profile: Profile) {
    await toggleAtivoMembro(profile.id, !profile.ativo)
    setLista(l => l.map(p => p.id === profile.id ? { ...p, ativo: !p.ativo } : p))
  }

  return (
    <div className="space-y-4">
      <h2 className="page-title text-2xl">Equipe</h2>

      <div className="space-y-3">
        {lista.map(profile => {
          const fat = faturamentoPorVendedor[profile.id] ?? 0
          const comissao = fat * (profile.comissao_pct / 100)

          return (
            <motion.div key={profile.id} layout className={`card space-y-2 ${!profile.ativo ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary font-medium">{profile.nome}</p>
                    <span className={profile.role === 'admin' ? 'badge-purple' : 'badge bg-white/5 text-text-muted border border-white/10'}>
                      {profile.role}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs font-mono mt-0.5">
                    Comissão: {profile.comissao_pct}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleAtivo(profile)} className="text-text-muted">
                    {profile.ativo
                      ? <ToggleRight size={20} className="text-neon-green" />
                      : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => abrirModal(profile)}
                    className="w-8 h-8 rounded-xl bg-bg-overlay border border-white/10 flex items-center justify-center text-text-muted hover:text-neon-purple hover:border-neon-purple/30 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>

              {fat > 0 && (
                <div className="flex gap-4 pt-1 border-t border-white/5">
                  <div>
                    <p className="field-label">Fat. do mês</p>
                    <p className="money text-sm">{formatCurrency(fat)}</p>
                  </div>
                  <div>
                    <p className="field-label">Comissão</p>
                    <p className="font-mono text-neon-purple text-sm">{formatCurrency(comissao)}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}

        {lista.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum membro na equipe</p>
          </div>
        )}
      </div>

      {/* Modal edição */}
      <AnimatePresence>
        {editando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setEditando(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-bg-elevated rounded-2xl w-full max-w-lg border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl uppercase">Editar Membro</h3>
                <button onClick={() => setEditando(null)}><X size={20} className="text-text-muted" /></button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="field-label">Nome</label>
                  <input {...register('nome')} className="input-field" />
                  {errors.nome && <p className="text-red-400 text-xs mt-1">Nome obrigatório</p>}
                </div>

                <div>
                  <label className="field-label">Função</label>
                  <select {...register('role')} className="input-field">
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Comissão (%)</label>
                  <input {...register('comissao_pct')} type="number" step="0.1" min="0" max="100" className="input-field" />
                  {errors.comissao_pct && <p className="text-red-400 text-xs mt-1">Valor inválido</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
