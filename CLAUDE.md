# 🛸 PsyGang Vendas — Instruções de Projeto

## Identidade da marca
- Nome: PsyGang Vendas
- Objetivo: Sistema de registro de vendas mobile-first pra loja física
- Estética: Dark mode, alien/psicodélico, neon roxo + verde
- Tipo: Webapp (PWA instalável no celular)

## Tech Stack
- Frontend: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Backend: Next.js API Routes + Server Actions
- Database: Supabase (Postgres + Auth + RLS)
- UI: Recharts, Framer Motion, Zustand
- Forms: react-hook-form + zod
- PWA: next-pwa
- Deploy: Vercel

## Funcionalidades MVP
1. Autenticação (email + senha Supabase)
2. Nova Venda (busca, carrinho, desconto, pagamento)
3. Histórico de Vendas (filtros)
4. Gestão de Produtos (CRUD)
5. Dashboard (KPIs, gráficos, ranking)
6. Gestão de Equipe (vendedores, comissão)
7. Recibo (exibir/imprimir/WhatsApp)

## Modelo de dados
profiles → id, nome, role (admin|vendedor), comissao_pct, ativo
produtos → id, nome, sku, preco_venda, custo, estoque, ativo
vendas → id, vendedor_id FK, total, desconto, forma_pagamento, observacao, created_at
venda_itens → id, venda_id FK, produto_id FK, qtd, preco_unitario, custo_unitario

## Skills do projeto
- nextjs-supabase-setup
- psygang-ui-system
- supabase-schema-builder
- mobile-first-pwa
- dashboard-metrics
- sales-flow-patterns

## Padrões de código
- TypeScript estrito, tipos em /lib/types.ts
- Sempre retornar { data, error }
- zod em formulários, RLS no banco
- Tailwind + tokens PsyGang
- Commits semânticos (feat:, fix:, style:)

## Fórmulas financeiras (imutáveis)
Faturamento = SUM(vendas.total)
CPV = SUM(venda_itens.custo_unitario * quantidade)
Lucro = Faturamento - CPV - SUM(descontos)
Margem % = (Lucro / Faturamento) * 100
Ticket Médio = Faturamento / COUNT(vendas)
Comissão = Faturamento Vendedor * (comissao_pct / 100)

## Workflow CLI
/skills → listar skills carregadas
/context reset → limpar contexto
/task [prompt] → rodar tarefa específica

## Checklist de execução
- [ ] Repo criado + .gitignore ok
- [ ] Estrutura de pastas criada
- [ ] .env.example com todas as vars
- [ ] Banco modelado e migrations rodadas
- [ ] Autenticação funcionando
- [ ] Tela de nova venda criada
- [ ] Dashboard com gráficos renderizando
- [ ] RLS funcionando
- [ ] PWA installável
- [ ] Deploy no Vercel funcionando
