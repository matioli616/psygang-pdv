-- ============================================
-- PsyGang Vendas — Migration Inicial
-- ============================================

-- ── Tipos Enum ──────────────────────────────
create type user_role as enum ('admin', 'vendedor');
create type forma_pagamento as enum ('dinheiro', 'credito', 'debito', 'pix');

-- ── Função updated_at ────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════
-- TABELA: profiles
-- (estende auth.users do Supabase)
-- ═══════════════════════════════════════════
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  role        user_role not null default 'vendedor',
  comissao_pct numeric(5,2) not null default 0 check (comissao_pct >= 0 and comissao_pct <= 100),
  ativo       boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index idx_profiles_role on profiles(role);

alter table profiles enable row level security;

-- Usuário vê/edita apenas o próprio perfil
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

-- Admin vê todos os profiles
create policy "profiles_select_admin" on profiles
  for select using (
    exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Usuário edita apenas o próprio
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- Admin edita qualquer um
create policy "profiles_update_admin" on profiles
  for update using (
    exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Trigger de criação automática de profile ao criar user no Auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'vendedor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Trigger updated_at
create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════
-- TABELA: produtos
-- ═══════════════════════════════════════════
create table produtos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  sku         text unique,
  preco_venda numeric(10,2) not null check (preco_venda >= 0),
  custo       numeric(10,2) not null default 0 check (custo >= 0),
  estoque     integer not null default 0 check (estoque >= 0),
  ativo       boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index idx_produtos_nome on produtos using gin(to_tsvector('portuguese', nome));
create index idx_produtos_sku on produtos(sku);
create index idx_produtos_ativo on produtos(ativo);

alter table produtos enable row level security;

-- Todos os autenticados podem ver produtos ativos
create policy "produtos_select_all" on produtos
  for select using (auth.uid() is not null);

-- Apenas admin gerencia produtos
create policy "produtos_insert_admin" on produtos
  for insert with check (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "produtos_update_admin" on produtos
  for update using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "produtos_delete_admin" on produtos
  for delete using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Trigger updated_at
create trigger produtos_updated_at
  before update on produtos
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════
-- TABELA: vendas
-- ═══════════════════════════════════════════
create table vendas (
  id               uuid primary key default gen_random_uuid(),
  vendedor_id      uuid not null references profiles(id) on delete restrict,
  total            numeric(10,2) not null check (total >= 0),
  desconto         numeric(10,2) not null default 0 check (desconto >= 0),
  forma_pagamento  forma_pagamento not null,
  observacao       text,
  created_at       timestamptz default now()
);

create index idx_vendas_vendedor on vendas(vendedor_id);
create index idx_vendas_data on vendas(created_at desc);
create index idx_vendas_forma_pagamento on vendas(forma_pagamento);

alter table vendas enable row level security;

-- Vendedor vê apenas suas próprias vendas
create policy "vendas_select_proprio" on vendas
  for select using (vendedor_id = auth.uid());

-- Admin vê todas
create policy "vendas_select_admin" on vendas
  for select using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Vendedor cria vendas para si mesmo
create policy "vendas_insert" on vendas
  for insert with check (vendedor_id = auth.uid());

-- ═══════════════════════════════════════════
-- TABELA: venda_itens
-- ═══════════════════════════════════════════
create table venda_itens (
  id              uuid primary key default gen_random_uuid(),
  venda_id        uuid not null references vendas(id) on delete cascade,
  produto_id      uuid not null references produtos(id) on delete restrict,
  qtd             integer not null check (qtd > 0),
  preco_unitario  numeric(10,2) not null check (preco_unitario >= 0),
  custo_unitario  numeric(10,2) not null default 0 check (custo_unitario >= 0),
  created_at      timestamptz default now()
);

create index idx_venda_itens_venda on venda_itens(venda_id);
create index idx_venda_itens_produto on venda_itens(produto_id);

alter table venda_itens enable row level security;

-- Herda acesso da venda pai
create policy "venda_itens_select" on venda_itens
  for select using (
    exists(
      select 1 from vendas v
      where v.id = venda_id
        and (
          v.vendedor_id = auth.uid()
          or exists(select 1 from profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

create policy "venda_itens_insert" on venda_itens
  for insert with check (
    exists(
      select 1 from vendas v
      where v.id = venda_id and v.vendedor_id = auth.uid()
    )
  );

-- ── Trigger: decrementa estoque ao inserir item ──
create or replace function decrementar_estoque()
returns trigger as $$
begin
  update produtos
  set estoque = estoque - new.qtd
  where id = new.produto_id;

  -- Valida que estoque não ficou negativo
  if (select estoque from produtos where id = new.produto_id) < 0 then
    raise exception 'Estoque insuficiente para o produto %', new.produto_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger after_venda_item_insert
  after insert on venda_itens
  for each row execute function decrementar_estoque();

-- ── Trigger: restaura estoque ao deletar item ──
create or replace function restaurar_estoque()
returns trigger as $$
begin
  update produtos
  set estoque = estoque + old.qtd
  where id = old.produto_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger after_venda_item_delete
  after delete on venda_itens
  for each row execute function restaurar_estoque();

-- ═══════════════════════════════════════════
-- RPC: criar_venda_completa
-- Cria venda + itens em uma transação atômica
-- ═══════════════════════════════════════════
create or replace function criar_venda_completa(
  p_forma_pagamento forma_pagamento,
  p_desconto        numeric,
  p_observacao      text,
  p_itens           jsonb  -- [{produto_id, qtd, preco_unitario, custo_unitario}]
)
returns json as $$
declare
  v_venda_id  uuid;
  v_total     numeric := 0;
  v_item      jsonb;
begin
  -- Calcula total a partir dos itens
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_total := v_total + ((v_item->>'preco_unitario')::numeric * (v_item->>'qtd')::integer);
  end loop;

  -- Desconto não pode ser maior que o total
  if p_desconto > v_total then
    raise exception 'Desconto (%) maior que o total (%)', p_desconto, v_total;
  end if;

  -- Cria a venda
  insert into vendas (vendedor_id, total, desconto, forma_pagamento, observacao)
  values (auth.uid(), v_total - p_desconto, p_desconto, p_forma_pagamento, p_observacao)
  returning id into v_venda_id;

  -- Cria os itens (trigger decrementa estoque automaticamente)
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    insert into venda_itens (venda_id, produto_id, qtd, preco_unitario, custo_unitario)
    values (
      v_venda_id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'qtd')::integer,
      (v_item->>'preco_unitario')::numeric,
      coalesce((v_item->>'custo_unitario')::numeric, 0)
    );
  end loop;

  return json_build_object(
    'venda_id', v_venda_id,
    'total', v_total - p_desconto,
    'desconto', p_desconto
  );
end;
$$ language plpgsql security definer;
