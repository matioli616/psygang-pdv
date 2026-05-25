function Skel({ className = '' }: { className?: string }) {
  return <div className={`bg-bg-overlay rounded-xl animate-pulse ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <Skel className="h-9 w-44" />
          <Skel className="h-3 w-32" />
        </div>
        <Skel className="h-6 w-20" />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5">
        {[...Array(5)].map((_, i) => <Skel key={i} className="h-8 w-16" />)}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-bg-elevated rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex justify-between">
              <Skel className="h-3 w-16" />
              <Skel className="h-4 w-4" />
            </div>
            <Skel className="h-7 w-24" />
            <Skel className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Área chart */}
      <div className="bg-bg-elevated rounded-2xl p-4 border border-white/5">
        <Skel className="h-3 w-36 mb-4" />
        <Skel className="h-40 w-full" />
      </div>

      {/* 2 charts lado a lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-bg-elevated rounded-2xl p-4 border border-white/5">
            <Skel className="h-3 w-28 mb-4" />
            <Skel className="h-44 w-full" />
          </div>
        ))}
      </div>

      {/* Top produtos */}
      <div className="bg-bg-elevated rounded-2xl p-4 border border-white/5">
        <Skel className="h-3 w-40 mb-4" />
        <Skel className="h-48 w-full" />
      </div>

      {/* Tabela */}
      <div className="bg-bg-elevated rounded-2xl p-4 border border-white/5 space-y-3">
        <Skel className="h-3 w-32 mb-2" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skel className="h-5 w-20" />
            <Skel className="h-5 w-6" />
            <Skel className="h-5 w-20" />
            <Skel className="h-5 w-14" />
            <Skel className="h-5 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
