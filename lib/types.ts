// ============================================
// PsyGang Vendas — Tipos globais
// ============================================

export type Role = 'admin' | 'vendedor'

export type FormaPagamento = 'dinheiro' | 'credito' | 'debito' | 'pix'

export interface Profile {
  id: string
  nome: string
  role: Role
  comissao_pct: number
  ativo: boolean
  created_at: string
}

export interface Produto {
  id: string
  nome: string
  sku: string | null
  preco_venda: number
  custo: number        // só admin lê (listar_produtos_admin)
  estoque: number
  ativo: boolean
  created_at: string
}

// Produto como o vendedor enxerga — sem custo (GRANT por coluna no banco)
export type ProdutoVenda = Pick<Produto, 'id' | 'nome' | 'sku' | 'preco_venda' | 'estoque'>

export interface Venda {
  id: string
  vendedor_id: string
  total: number
  desconto: number
  forma_pagamento: FormaPagamento
  observacao?: string
  numero?: number
  created_at: string
  // joins
  profiles?: Profile
  venda_itens?: VendaItem[]
}

export interface VendaItem {
  id: string
  venda_id: string
  produto_id: string
  qtd: number
  preco_unitario: number
  custo_unitario?: number   // só admin lê
  desconto_item?: number
  // join
  produtos?: Produto
}

// Cupom de desconto
export type TipoDesconto = 'fixo' | 'percentual'

export interface Cupom {
  id: string
  codigo: string
  tipo: TipoDesconto
  valor: number
  ativo: boolean
  uso_maximo: number | null
  usos: number
  validade_em: string | null
  created_at: string
}

export interface CupomAplicado {
  id: string
  codigo: string
  tipo: TipoDesconto
  valor: number          // valor original do cupom (% ou R$)
}

// Carrinho (estado local, não persiste no banco)
export interface CarrinhoItem {
  produto: ProdutoVenda
  qtd: number
  desconto_item: number  // desconto R$ aplicado só neste item
}

// Padrão de resposta de todas as funções que chamam Supabase
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Linha retornada por dashboard_vendas()
export interface VendaDashboard {
  id: string
  total: number
  desconto: number
  forma_pagamento: FormaPagamento
  vendedor_id: string
  created_at: string
  profiles: { nome: string } | null
  venda_itens: {
    qtd: number
    preco_unitario: number
    custo_unitario: number
    produtos: { nome: string } | null
  }[]
}

// KPIs do dashboard
export interface DashboardKPIs {
  faturamento: number
  cpv: number
  lucro: number
  margem: number
  ticketMedio: number
  totalVendas: number
}
