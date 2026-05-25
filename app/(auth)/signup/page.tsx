'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

const schema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: 'Senhas não coincidem',
  path: ['confirmarSenha'],
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: {
        data: { nome: data.nome },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide text-text-primary">
          Criar Conta
        </h2>
        <p className="text-text-muted text-sm mt-1">Junte-se ao time</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Nome</label>
          <input
            {...register('nome')}
            type="text"
            placeholder="Seu nome"
            className="input-field"
          />
          {errors.nome && (
            <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        <div>
          <label className="field-label">E-mail</label>
          <input
            {...register('email')}
            type="email"
            placeholder="seu@email.com"
            className="input-field"
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="field-label">Senha</label>
          <div className="relative">
            <input
              {...register('senha')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.senha && (
            <p className="text-red-400 text-xs mt-1">{errors.senha.message}</p>
          )}
        </div>

        <div>
          <label className="field-label">Confirmar Senha</label>
          <input
            {...register('confirmarSenha')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="input-field"
            autoComplete="new-password"
          />
          {errors.confirmarSenha && (
            <p className="text-red-400 text-xs mt-1">{errors.confirmarSenha.message}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-pulse">Criando conta...</span>
          ) : (
            <>
              <UserPlus size={18} />
              Criar Conta
            </>
          )}
        </button>
      </form>

      <p className="text-center text-text-muted text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-neon-purple hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
