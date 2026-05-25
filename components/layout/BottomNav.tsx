'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Package, Users, ClipboardList, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home',     icon: <LayoutDashboard size={20} />, adminOnly: true },
  { href: '/venda/nova', label: 'Vender',  icon: <ShoppingBag size={20} /> },
  { href: '/vendas',     label: 'Vendas',  icon: <ClipboardList size={20} /> },
  { href: '/produtos',   label: 'Produtos',icon: <Package size={20} />, adminOnly: true },
  { href: '/cupons',     label: 'Cupons',  icon: <Tag size={20} />, adminOnly: true },
  { href: '/equipe',     label: 'Equipe',  icon: <Users size={20} />, adminOnly: true },
]

export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-elevated/90 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-1.5 pb-safe overflow-x-auto gap-1 no-scrollbar">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-150 min-w-[50px] shrink-0',
                isActive
                  ? 'text-neon-purple bg-neon-purple/10'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {item.icon}
              <span className={cn(
                'text-[10px] uppercase tracking-wider font-mono',
                isActive ? 'text-neon-purple' : 'text-text-muted'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
