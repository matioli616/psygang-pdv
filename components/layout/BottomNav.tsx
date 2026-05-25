'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Package, Users, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} />, adminOnly: true },
  { href: '/venda/nova', label: 'Vender', icon: <ShoppingBag size={22} /> },
  { href: '/vendas', label: 'Vendas', icon: <ClipboardList size={22} /> },
  { href: '/produtos', label: 'Produtos', icon: <Package size={22} />, adminOnly: true },
  { href: '/equipe', label: 'Equipe', icon: <Users size={22} />, adminOnly: true },
]

export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-elevated/90 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2 pb-safe">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 min-w-[56px]',
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
