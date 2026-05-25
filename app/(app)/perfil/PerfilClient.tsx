'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Mail, Shield, LogOut, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { atualizarNome, atualizarSenha, fazerLogout } from '@/lib/actions/perfil'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile | null
  email: string
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'erro' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mt-2 ${
        type === 'ok'
          ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {type === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </motion.div>
  )
}

export default function PerfilClient({ profile, email }: Props) {
  const router = useRouter()
  const [isPendingNome, startNome] = useTransition()
  const [isPendingSenha, startSenha] = useTransition()
  const [isPendingLogout, startLogout] = useTransition()

  // Nome
  const [nome, setNome] = useState(profile?.nome ?? '')
  const [nomeMsg, setNomeMsg] = useState<{ text: string; type: 'ok' | 'erro' } | null>(null)

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [senhaMsg, setSenhaMsg] = useState<{ text: string; type: 'ok' | 'erro' } | null>(null)

  // Logout confirm
  const [confirmLogout, setConfirmLogout] = useState(false)

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PG'

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Vendedor'
  const roleBg = profile?.role === 'admin'
    ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/30'
    : 'bg-neon-green/10 text-neon-green border-neon-green/30'

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  async function handleNome() {
    setNomeMsg(null)
    startNome(async () => {
      const { error } = await atualizarNome(nome)
      if (error) {
        setNomeMsg({ text: error, type: 'erro' })
      } else {
        setNomeMsg({ text: 'Nome atualizado!', type: 'ok' })
        router.refresh()
        setTimeout(() => setNomeMsg(null), 3000)
      }
    })
  }

  async function handleSenha() {
    setSenhaMsg(null)
    if (novaSenha !== confirmarSenha) {
      setSenhaMsg({ text: 'As senhas não coincidem', type: 'erro' })
      return
    }
    if (novaSenha.length < 6) {
      setSenhaMsg({ text: 'Nova senha deve ter pelo menos 6 caracteres', type: 'erro' })
      return
    }
    startSenha(async () => {
      const { error } = await atualizarSenha(senhaAtual, novaSenha)
      if (error) {
        setSenhaMsg({ text: error, type: 'erro' })
      } else {
        setSenhaMsg({ text: 'Senha alterada com sucesso!', type: 'ok' })
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarSenha('')
        setTimeout(() => setSenhaMsg(null), 3000)
      }
    })
  }

  async function handleLogout() {
    startLogout(async () => {
      await fazerLogout()
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Avatar Card ─────────────────────────────── */}
      <div className="bg-bg-elevated border border-white/8 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-neon-purple/20 border-2 border-neon-purple/50 flex items-center justify-center shrink-0">
          <span className="font-display text-2xl text-neon-purple">{initials}</span>
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-text-primary text-lg leading-tight truncate">
            {profile?.nome ?? 'Sem nome'}
          </h2>
          <p className="text-text-muted text-sm truncate">{email}</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full border font-mono uppercase ${roleBg}`}>
            <Shield size={10} />
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Editar Nome ─────────────────────────────── */}
      <section className="bg-bg-elevated border border-white/8 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <User size={15} />
          <span className="text-sm font-semibold uppercase tracking-wider font-mono">Editar Nome</span>
        </div>

        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="input-field"
          placeholder="Seu nome"
          maxLength={50}
        />

        <button
          onClick={handleNome}
          disabled={isPendingNome || nome.trim() === (profile?.nome ?? '')}
          className="btn-primary w-full disabled:opacity-40"
        >
          {isPendingNome ? 'Salvando...' : 'Salvar Nome'}
        </button>

        <AnimatePresence>
          {nomeMsg && <Toast msg={nomeMsg.text} type={nomeMsg.type} />}
        </AnimatePresence>
      </section>

      {/* ── Alterar Senha ───────────────────────────── */}
      <section className="bg-bg-elevated border border-white/8 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <Lock size={15} />
          <span className="text-sm font-semibold uppercase tracking-wider font-mono">Alterar Senha</span>
        </div>

        {/* Senha atual */}
        <div className="relative">
          <input
            type={showSenhaAtual ? 'text' : 'password'}
            value={senhaAtual}
            onChange={e => setSenhaAtual(e.target.value)}
            className="input-field pr-10"
            placeholder="Senha atual"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowSenhaAtual(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            {showSenhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Nova senha */}
        <div className="relative">
          <input
            type={showNovaSenha ? 'text' : 'password'}
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            className="input-field pr-10"
            placeholder="Nova senha (mín. 6 caracteres)"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNovaSenha(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Confirmar */}
        <input
          type="password"
          value={confirmarSenha}
          onChange={e => setConfirmarSenha(e.target.value)}
          className={`input-field ${
            confirmarSenha && novaSenha !== confirmarSenha ? '!border-red-500/50' : ''
          }`}
          placeholder="Confirmar nova senha"
          autoComplete="new-password"
        />

        <button
          onClick={handleSenha}
          disabled={isPendingSenha || !senhaAtual || !novaSenha || !confirmarSenha}
          className="btn-primary w-full disabled:opacity-40"
        >
          {isPendingSenha ? 'Alterando...' : 'Alterar Senha'}
        </button>

        <AnimatePresence>
          {senhaMsg && <Toast msg={senhaMsg.text} type={senhaMsg.type} />}
        </AnimatePresence>
      </section>

      {/* ── Conta Info ──────────────────────────────── */}
      <section className="bg-bg-elevated border border-white/8 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <Mail size={15} />
          <span className="text-sm font-semibold uppercase tracking-wider font-mono">Conta</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
          <span className="text-text-muted text-sm">E-mail</span>
          <span className="text-text-secondary text-sm font-mono truncate max-w-[60%] text-right">{email}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
          <span className="text-text-muted text-sm">Nível</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${roleBg}`}>{roleLabel}</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-text-muted text-sm">Membro desde</span>
          <span className="text-text-secondary text-sm capitalize">{memberSince}</span>
        </div>
      </section>

      {/* ── Logout ──────────────────────────────────── */}
      <section className="bg-bg-elevated border border-red-500/15 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-red-400 mb-3">
          <LogOut size={15} />
          <span className="text-sm font-semibold uppercase tracking-wider font-mono">Sair da conta</span>
        </div>

        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 active:scale-95 transition-all"
          >
            Sair
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-text-muted text-sm text-center">Tem certeza?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="py-3 rounded-xl border border-white/10 text-text-secondary text-sm font-semibold hover:bg-white/5 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={isPendingLogout}
                className="py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {isPendingLogout ? 'Saindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Espaço extra pro BottomNav */}
      <div className="h-4" />
    </div>
  )
}
