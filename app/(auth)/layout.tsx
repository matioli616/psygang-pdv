export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-5xl text-neon-purple tracking-widest uppercase">
          PsyGang
        </h1>
        <p className="text-text-muted text-xs uppercase tracking-[0.3em] mt-1">
          Sistema de Vendas
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
