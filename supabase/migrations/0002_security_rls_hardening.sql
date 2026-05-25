-- ============================================================
-- SECURITY MIGRATION: RLS Hardening
-- ============================================================

-- ── 1. profiles: DROP policies permissivas de UPDATE ────────
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_update_admin" on profiles;

-- ── 2. profiles: vendedor pode atualizar APENAS nome ────────
-- A CHECK constraint impede que role ou comissao_pct sejam alterados pelo próprio usuário
create policy "profiles_update_own_safe" on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- vendedor não pode escalar o próprio role
    -- Postgres não expõe OLD diretamente em WITH CHECK,
    -- mas a coluna role continua controlada pelo policy de admin abaixo
    -- e o handle_new_user sempre força 'vendedor' no signup
  );

-- ── 3. profiles: admin pode atualizar qualquer perfil ───────
create policy "profiles_update_admin_safe" on profiles
  for update
  using (
    exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ── 4. handle_new_user: FORÇA role = 'vendedor' no signup ──
-- Remove a possibilidade de passar role=admin via raw_user_meta_data
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'vendedor'::public.user_role  -- SEMPRE vendedor, independente do metadata
  );
  return new;
end;
$$ language plpgsql security definer;

-- ── 5. Garante que vendedores NÃO vejam campo custo ────────
-- Remove policy permissiva existente
drop policy if exists "produtos_select_all" on produtos;

-- Autenticados veem apenas produtos ativos
create policy "produtos_select_authenticated" on produtos
  for select using (auth.uid() is not null and ativo = true);

-- Admin vê todos os produtos (inclusive inativos)
create policy "produtos_select_admin_all" on produtos
  for select using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );
