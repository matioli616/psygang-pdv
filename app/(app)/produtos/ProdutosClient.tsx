'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, X, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Produto } from '@/lib/types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  sku: z.string().optional(),
  preco_venda: z.coerce.number().min(0, 'Preço inválido'),
  custo: z.coerce.number().min(0, 'Custo inválido'),
  estoque: z.coerce.number().int().min(0, 'Estoque inválido'),
})
type FormData = z.infer<typeof schema>

export default function ProdutosClient({ initialProdutos }: { initialProdutos: Produto[] }) {
  const router = useRouter()
  const [produtos, setProdutos] = useState(initialProdutos)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function abrirModal(produto?: Produto) {
    setEditando(produto ?? null)
    reset(produto ? {
      nome: produto.nome,
      sku: produto.sku ?? '',
      preco_venda: produto.preco_venda,
      custo: produto.custo,
      estoque: produto.estoque,
    } : {})
    setModalAberto(true)
    setErro(null)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setErro(null)
    const supabase = createClient()

    if (editando) {
      const { error } = await supabase
        .from('produtos')
        .update({ ...data, sku: data.sku || null })
        .eq('id', editando.id)

      if (error) { setErro(error.message); setLoading(false); return }
      setProdutos(p => p.map(x => x.id === editando.id ? { ...x, ...data } : x))
    } else {
      const { data: novo, error } = await supabase
        .from('produtos')
        .insert({ ...data, sku: data.sku || null })
        .select()
        .single()

      if (error) { setErro(error.message); setLoading(false); return }
      setProdutos(p => [...p, novo as Produto].sort((a, b) => a.nome.localeCompare(b.nome)))
    }

    setModalAberto(false)
    setLoading(false)
    router.refresh()
  }

  async function toggleAtivo(produto: Produto) {
    const supabase = createClient()
    await supabase.from('produtos').update({ ativo: !produto.ativo }).eq('id', produto.id)
    setProdutos(p => p.map(x => x.id === produto.id ? { ...x, ativo: !x.ativo } : x))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="page-title text-2xl">Produtos</h2>
        <button onClick={() => abrirModal()} className="btn-primary px-4 py-2 text-sm flex items-center gap-1">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="space-y-2">
        {produtos.map(produto => (
          <motion.div
            key={produto.id}
            layout
            className={`card flex items-center gap-3 ${!produto.ativo ? 'opacity-50' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-text-primary font-medium truncate">{produto.nome}</p>
                {produto.sku && (
                  <span className="badge bg-white/5 text-text-muted border border-white/10 shrink-0">
                    {produto.sku}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="money text-sm">{formatCurrency(produto.preco_venda)}</span>
                <span className="text-text-muted text-xs">custo {formatCurrency(produto.custo)}</span>
                <span className="text-text-muted text-xs">estoque: {produto.estoque}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleAtivo(produto)}
                className="text-text-muted hover:text-neon-purple transition-colors"
              >
                {produto.ativo ? <ToggleRight size={20} className="text-neon-green" /> : <ToggleLeft size={20} />}
              </button>
              <button
                onClick={() => abrirModal(produto)}
                className="w-8 h-8 rounded-xl bg-bg-overlay border border-white/10 flex items-center justify-center text-text-muted hover:text-neon-purple hover:border-neon-purple/30 transition-colors active:scale-90"
              >
                <Edit2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}

        {produtos.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum produto cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setModalAberto(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-bg-elevated rounded-2xl w-full max-w-lg border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl uppercase tracking-wide">
                  {editando ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button onClick={() => setModalAberto(false)} className="text-text-muted">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="field-label">Nome</label>
                  <input {...register('nome')} className="input-field" placeholder="Nome do produto" />
                  {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>}
                </div>

                <div>
                  <label className="field-label">SKU (opcional)</label>
                  <input {...register('sku')} className="input-field" placeholder="CAM-001" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Preço Venda</label>
                    <input {...register('preco_venda')} type="number" step="0.01" className="input-field" placeholder="0,00" />
                    {errors.preco_venda && <p className="text-red-400 text-xs mt-1">{errors.preco_venda.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Custo</label>
                    <input {...register('custo')} type="number" step="0.01" className="input-field" placeholder="0,00" />
                    {errors.custo && <p className="text-red-400 text-xs mt-1">{errors.custo.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="field-label">Estoque</label>
                  <input {...register('estoque')} type="number" className="input-field" placeholder="0" />
                  {errors.estoque && <p className="text-red-400 text-xs mt-1">{errors.estoque.message}</p>}
                </div>

                {erro && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">{erro}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
