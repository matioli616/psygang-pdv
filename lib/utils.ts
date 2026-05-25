import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes sem conflito
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata valor em BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formata data pt-BR com hora
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Formata data curta (sem hora)
export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Fórmulas financeiras (imutáveis — vide CLAUDE.md)
export function calcularFaturamento(totais: number[]): number {
  return totais.reduce((acc, v) => acc + v, 0)
}

export function calcularCPV(itens: { custo_unitario: number; qtd: number }[]): number {
  return itens.reduce((acc, i) => acc + i.custo_unitario * i.qtd, 0)
}

export function calcularLucro(faturamento: number, cpv: number, descontos: number): number {
  return faturamento - cpv - descontos
}

export function calcularMargem(lucro: number, faturamento: number): number {
  if (faturamento === 0) return 0
  return (lucro / faturamento) * 100
}

export function calcularTicketMedio(faturamento: number, totalVendas: number): number {
  if (totalVendas === 0) return 0
  return faturamento / totalVendas
}

export function calcularComissao(faturamento: number, comissaoPct: number): number {
  return faturamento * (comissaoPct / 100)
}
