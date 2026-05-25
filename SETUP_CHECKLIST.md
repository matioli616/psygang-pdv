# ✅ Checklist de Setup — PsyGang Vendas

## Fase 1: Preparação
- [ ] Repo criado: psygang-vendas (GitHub, privado)
- [ ] Codespaces aberto
- [ ] claude.md criado
- [ ] AGENTS_PROMPT.md criado
- [ ] Skills em .claude/skills/ (6 pastas)
- [ ] .gitignore configurado

## Fase 2: Init do projeto
CLI: claude
Prompt:
"Inicialize o projeto PsyGang Vendas: Next.js 14, TypeScript, Tailwind, shadcn/ui, 
Supabase, Zustand, Recharts, Framer Motion, date-fns, react-hook-form, zod, next-pwa.
Estrutura: /app, /lib, /components, /public, /supabase/migrations.
Configure tailwind com tokens PsyGang, middleware.ts, .env.example, manifest.ts.
Init git, commit inicial."

- [ ] npm run dev funciona
- [ ] Estrutura OK
- [ ] Skills carregadas (/skills)

## Fase 3: Banco de dados
Pega credenciais Supabase:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

Copia em .env.local

Prompt Claude Code:
"Crie migration /supabase/migrations/001_init.sql:
- profiles (id, nome, role, comissao_pct, ativo)
- produtos (id, nome, sku, preco_venda, custo, estoque, ativo)
- vendas (id, vendedor_id FK, total, desconto, forma_pagamento enum, observacao)
- venda_itens (id, venda_id FK, produto_id FK, qtd, preco_unitario, custo_unitario)
Com RLS, índices, triggers updated_at, trigger decrementa estoque."

Terminal: supabase migration up

- [ ] Migrations rodadas
- [ ] RLS funcionando
- [ ] Dados exemplo inseridos

## Fase 4: Autenticação
Prompt:
"Tela /app/(auth)/login/page.tsx: email, senha, validação zod, 
erro claro, redirect após sucesso. Estilos PsyGang. Mobile-first."

Também signup.

- [ ] Login funciona
- [ ] Logout funciona
- [ ] Rotas protegidas

## Fase 5: Nova Venda
Prompt:
"Tela /app/(app)/venda/nova: busca produto (autocomplete), 
grid produtos (clica = carrinho), carrinho com +/-, desconto, 
4 botões pagamento, observacao, botão FECHAR VENDA (bottom, roxo).
Zustand carrinho, react-hook-form + zod, Framer animação sucesso.
Salva em /api/vendas."

- [ ] Busca funciona
- [ ] Carrinho +/-
- [ ] Desconto
- [ ] Venda salva
- [ ] Recibo exibe

## Fase 6: Dashboard
Prompt:
"Tela /app/(app)/dashboard (admin): KPIs (faturamento, lucro, margem, ticket),
Recharts (linha 30d, barras ranking, pizza pagamento), tabela últimas 20 vendas,
filtros (hoje, 7d, 30d). Cálculos corretos (vide claude.md)."

- [ ] KPIs renderizam
- [ ] Gráficos OK
- [ ] Cálculos corretos
- [ ] Filtros funcionam

## Fase 7: Extras
- /app/(app)/produtos (CRUD)
- /app/(app)/equipe (vendedores)
- /app/(app)/vendas (histórico)
- PWA manifest + service worker

- [ ] CRUD produtos
- [ ] Vendedores OK
- [ ] Histórico filtrável
- [ ] PWA installável

## Fase 8: Produção
Prompt:
"Setup Vercel: domain, env vars, backup plan, README.md"

Terminal: git push origin main

- [ ] Deploy em vendas.psygang.com
- [ ] Tudo funciona em prod
- [ ] PWA installável
- [ ] Zero erros

---

## Tempo estimado
Fase 1: 5 min
Fase 2: 5 min
Fase 3: 10 min
Fase 4: 10 min
Fase 5: 30 min
Fase 6: 20 min
Fase 7: 20 min
Fase 8: 10 min
Total: ~110 min (2 horas) MVP completo em produção

---

## Quando travar
Erro auth? → AgentDB (RLS)
Tela estranha? → AgentUI (Tailwind)
Venda não salva? → AgentAPI (Server Action)
Deploy falhou? → AgentDevOps (env var)

No Claude Code: /context reset ou /skills
