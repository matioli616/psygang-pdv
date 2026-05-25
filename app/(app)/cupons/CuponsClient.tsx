'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Tag, X, Edit2, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Cupom, TipoDesconto } from '@/lib/types'

const schema = z.object({
  codigo:      z.string().min(3, 'Mínimo 3 caracteres').max(20).toUpperCase(),
  tipo:        z.enum(['fixo', 'percentual']),
  valor:       z.coerce.number().min(0.01, 'Valor obrigatório'),
  uso_maximo:  z.coerce.number().int().min(1).optional().or(z.literal('')),
  validade_em: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CuponsClient({ initialCupons }: { initialCupons: Cupom[] }) {
  const [cupons, setCupons] = useState(initialCupons)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Cupom | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'percentual' },
  })

  const tipoWatch = watch('tipo')

  function abrirModal(cupom?: Cupom) {
    setEditando(cupom ?? null)
    reset(cupom ? {
      codigo:      cupom.codigo,
      tipo:        cupom.tipo,
      valor:       cupom.valor,
      uso_maximo:  cupom.uso_maximo ?? '',
      validade_em: cupom.validade_em ? cupom.validade_em.split('T')[0] : '',
    } : { tipo: 'percentual', codigo: '', valor: undefined, uso_maximo: '', validade_em: '' })
    setErro(null)
    setModal(true)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setErro(null)
    const supabase = createClient()

    const payload = {
      codigo:      data.codigo.toUpperCase(),
      tipo:        data.tipo,
      valor:       data.valor,
      uso_maximo:  data.uso_maximo ? Number(data.uso_maximo) : null,
      validade_em: data.validade_em ? new Date(data.validade_em + 'T23:59:59').toISOString() : null,
    }

    if (editando) {
      const { error } = await supabase.from('cupons').update(payload).eq('id', editando.id)
      if (error) { setErro(error.message); setLoading(false); return }
      setCupons(c => c.map(x => x.id === editando.id ? { ...x, ...payload } : x))
    } else {
      const { data: novo, error } = await supabase.from('cupons').insert(payload).select().single()
      if (error) { setErro(error.message); setLoading(false); return }
      setCupons(c => [novo as Cupom, ...c])
    }

    setModal(false)
    setLoading(false)
  }

  async function toggleAtivo(cupom: Cupom) {
    const supabase = createClient()
    await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id)
    setCupons(c => c.map(x => x.id === cupom.id ? { ...x, ativo: !x.ativo } : x))
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 2000)
  }

  function isExpirado(cupom: Cupom) {
    return !!cupom.validade_em && new Date(cupom.validade_em) < new Date()
  }

  function isEsgotado(cupom: Cupom) {
    return !!cupom.uso_maximo && cupom.usos >= cupom.uso_maximo
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="page-title text-2xl">Cupons</h2>
        <button onClick={() => abrirModal()} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="space-y-3">
        {cupons.map(cupom => {
          const expirado = isExpirado(cupom)
          const esgotado = isEsgotado(cupom)
          const inativo  = !cupom.ativo || expirado || esgotado

          return (
            <motion.div key={cupom.id} layout
              className={`card space-y-2 transition-opacity ${inativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Código clicável */}
                  <button
                    onClick={() => copiarCodigo(cupom.codigo)}
                    className="font-mono text-neon-purple font-bold tracking-widest text-sm flex items-center gap-1.5 hover:text-neon-pink transition-colors"
                  >
                    {cupom.codigo}
                    {copiado === cupom.codigo
                      ? <Check size={12} className="text-neon-green" />
                      : <Copy size={12} />}
                  </button>

                  {/* Valor */}
                  <span className={`badge ${cupom.tipo === 'percentual' ? 'badge-green' : 'badge-purple'}`}>
                    {cupom.tipo === 'percentual' ? `${cupom.valor}%` : formatCurrency(cupom.valor)}
                  </span>

                  {/* Status */}
                  {expirado && <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Expirado</span>}
                  {esgotado && <span className="badge bg-orange-500/20 text-orange-400 border border-orange-500/30">Esgotado</span>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleAtivo(cupom)} className="text-text-muted">
                    {cupom.ativo && !expirado && !esgotado
                      ? <ToggleRight size={20} className="text-neon-green" />
                      : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => abrirModal(cupom)}
                    className="w-8 h-8 rounded-xl bg-bg-overlay border border-white/10 flex items-center justify-center text-text-muted hover:text-neon-purple hover:border-neon-purple/30 transition-colors active:scale-90"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-center gap-3 text-xs font-mono text-text-muted flex-wrap">
                <span>Usos: {cupom.usos}{cupom.uso_maximo ? `/${cupom.uso_maximo}` : ''}</span>
                {cupom.validade_em && (
                  <span>Válido até: {new Date(cupom.validade_em).toLocaleDateString('pt-BR')}</span>
                )}
                {!cupom.uso_maximo && !cupom.validade_em && (
                  <span className="text-neon-green/60">Ilimitado</span>
                )}
              </div>
            </motion.div>
          )
        })}

        {cupons.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <Tag size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum cupom cadastrado</p>
            <p className="text-xs mt-1">Crie um cupom para oferecer descontos especiais</p>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
            onClick={e => e.target === e.currentTarget && setModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="bg-bg-elevated rounded-2xl w-full max-w-lg border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl uppercase tracking-wide">
                  {editando ? 'Editar Cupom' : 'Novo Cupom'}
                </h3>
                <button onClick={() => setModal(false)}><X size={20} className="text-text-muted" /></button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

                {/* Código */}
                <div>
                  <label className="field-label">Código</label>
                  <input {...register('codigo')} className="input-field font-mono uppercase tracking-widest"
                    placeholder="EX: PROMO10" />
                  {errors.codigo && <p className="text-red-400 text-xs mt-1">{errors.codigo.message}</p>}
                </div>

                {/* Tipo + Valor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Tipo</label>
                    <select {...register('tipo')} className="input-field">
                      <option value="percentual">Percentual (%)</option>
                      <option value="fixo">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">
                      {tipoWatch === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                    </label>
                    <input {...register('valor')} type="number" step="0.01" min="0.01"
                      max={tipoWatch === 'percentual' ? 100 : undefined}
                      placeholder={tipoWatch === 'percentual' ? '10' : '20,00'}
                      className="input-field" />
                    {errors.valor && <p className="text-red-400 text-xs mt-1">{errors.valor.message}</p>}
                  </div>
                </div>

                {/* Limite de uso + Validade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Limite de usos</label>
                    <input {...register('uso_maximo')} type="number" min="1"
                      placeholder="Ilimitado" className="input-field" />
                  </div>
                  <div>
                    <label className="field-label">Validade</label>
                    <input {...register('validade_em')} type="date" className="input-field" />
                  </div>
                </div>

                {erro && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">{erro}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Cupom'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
