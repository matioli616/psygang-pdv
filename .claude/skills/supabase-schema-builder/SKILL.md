---
name: supabase-schema-builder
description: Use ao criar tabelas, migrations, policies RLS, triggers ou funções no Supabase. Acionar quando o usuário pedir para modelar banco de dados, adicionar coluna, criar tabela nova, configurar segurança de dados, ou ao trabalhar com qualquer SQL relacionado ao Supabase Postgres.
---

# Supabase Schema Builder

## Regras invioláveis
1. TODA tabela tem RLS habilitado (ENABLE ROW LEVEL SECURITY)
2. TODA tabela tem id uuid primary key default gen_random_uuid()
3. TODA tabela tem created_at timestamptz default now()
4. Tabelas mutáveis têm updated_at timestamptz default now() + trigger
5. Foreign keys SEMPRE com on delete definido (cascade ou set null)
6. Enums via tipos próprios (create type ... as enum)
7. Índices em todas as FK e colunas de busca frequente

## Padrão de migration
Arquivo em /supabase/migrations/NNNN_descricao.sql, numeração sequencial.

```sql
-- 0002_vendas.sql

create type forma_pagamento as enum ('pix', 'dinheiro', 'debito', 'credito');

create table vendas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references profiles(id) on delete restrict,
  total numeric(10,2) not null check (total >= 0),
  desconto numeric(10,2) default 0 check (desconto >= 0),
  forma_pagamento forma_pagamento not null,
  observacao text,
  created_at timestamptz default now()
);

create index idx_vendas_vendedor on vendas(vendedor_id);
create index idx_vendas_data on vendas(created_at desc);

alter table vendas enable row level security;

create policy "vendedor_select_proprias" on vendas
  for select using (vendedor_id = auth.uid());

create policy "admin_select_todas" on vendas
  for select using (
    exists(select 1 from profiles 
           where id = auth.uid() and role = 'admin')
  );

create policy "vendedor_insert" on vendas
  for insert with check (vendedor_id = auth.uid());
```

## Triggers úteis (sempre considere)
- updated_at automático
- Decrementar estoque ao inserir venda_itens
- Validar saldo de estoque antes de venda
- Calcular total da venda a partir dos itens

## Funções RPC
Quando lógica passa de uma tabela, criar função SQL e chamar via supabase.rpc().
Exemplo: criar_venda_completa(itens jsonb, forma_pagamento, desconto) faz tudo em transação.

## Seeds
Arquivo /supabase/seed.sql com dados de exemplo. SEMPRE incluir um admin de teste.
