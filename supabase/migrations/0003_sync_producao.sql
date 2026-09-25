-- ============================================================
-- SYNC: alterações que foram aplicadas direto no banco de produção
-- (via painel/MCP) e não estavam versionadas no repositório.
-- Reconstruído a partir de pg_policies / pg_proc /
-- supabase_migrations.schema_migrations em 2026-09-25.
--
-- Em produção isso JÁ está aplicado — este arquivo existe para que
-- um banco novo (staging, restore) chegue ao mesmo estado.
-- ============================================================

-- ── get_my_role(): evita recursão de RLS em policies de profiles ──
create or replace function public.get_my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() limit 1;
$$;

-- ── profiles: todos autenticados leem perfis (ranking, nomes) ──
drop policy if exists "profiles_select_own"   on profiles;
drop policy if exists "profiles_select_admin" on profiles;
create policy "profiles_select_auth" on profiles
  for select using (auth.uid() is not null);

-- ── produtos: policies de escrita via get_my_role() ──
drop policy if exists "produtos_insert_admin" on produtos;
drop policy if exists "produtos_update_admin" on produtos;
drop policy if exists "produtos_delete_admin" on produtos;
create policy "produtos_insert_admin" on produtos
  for insert with check (public.get_my_role() = 'admin');
create policy "produtos_update_admin" on produtos
  for update using (public.get_my_role() = 'admin');
create policy "produtos_delete_admin" on produtos
  for delete using (public.get_my_role() = 'admin');

-- ── vendas ──
drop policy if exists "vendas_select_admin" on vendas;
create policy "vendas_select_admin" on vendas
  for select using (public.get_my_role() = 'admin');

create policy "vendas_delete_admin" on vendas
  for delete using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "vendas_delete_proprio" on vendas
  for delete using (vendedor_id = auth.uid());

-- ── venda_itens ──
drop policy if exists "venda_itens_select" on venda_itens;
create policy "venda_itens_select_auth" on venda_itens
  for select using (
    exists(
      select 1 from vendas v
      where v.id = venda_itens.venda_id
        and (v.vendedor_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

-- ── Descontos (produção: migration "0002_descontos") ──
alter table venda_itens
  add column if not exists desconto_item numeric(10,2) not null default 0
  check (desconto_item >= 0);

create table if not exists cupons (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique not null,
  tipo        text not null check (tipo in ('percentual', 'fixo')),
  valor       numeric(10,2) not null check (valor > 0),
  ativo       boolean not null default true,
  uso_maximo  integer check (uso_maximo > 0),   -- null = ilimitado
  usos        integer not null default 0,
  validade_em timestamptz,                       -- null = sem validade
  created_at  timestamptz default now()
);

alter table vendas
  add column if not exists cupon_id uuid references cupons(id) on delete set null;

create index if not exists idx_cupons_codigo on cupons(codigo);
create index if not exists idx_cupons_ativo  on cupons(ativo);

alter table cupons enable row level security;

create policy "cupons_select_auth" on cupons
  for select using (auth.uid() is not null);
create policy "cupons_insert_admin" on cupons
  for insert with check (public.get_my_role() = 'admin');
create policy "cupons_update_admin" on cupons
  for update using (public.get_my_role() = 'admin');
create policy "cupons_delete_admin" on cupons
  for delete using (public.get_my_role() = 'admin');

-- criar_venda_completa com 5 parâmetros (p_cupon_id) — substituída na 0004.

-- ── Estoque: triggers desativados em produção (migration "disable_estoque_triggers") ──
-- O controle de estoque está pausado de propósito; reativar com ENABLE TRIGGER.
alter table venda_itens disable trigger after_venda_item_insert;
alter table venda_itens disable trigger after_venda_item_delete;

-- Obs.: produção também tem as tabelas rc_commands / rc_messages
-- (migration "create_remote_control_tables"), que não pertencem ao PDV.
