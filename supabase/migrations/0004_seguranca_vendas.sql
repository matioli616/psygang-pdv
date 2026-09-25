-- ============================================================
-- SECURITY: correções da auditoria de 2026-09-25
--  1. Escalada de privilégio via UPDATE em profiles.role
--  2. Preço/custo da venda vinham do navegador
--  3. Vendedor lia produtos.custo e venda_itens.custo_unitario
--  4. Escrita direta em vendas/venda_itens, fora da RPC
--  5. Número de recibo estável (coluna sequencial)
--  6. Cadastro aberto: novos usuários entram inativos até aprovação
-- ============================================================

-- ════════════════════════════════════════════
-- 1. Identidade: só usuário ATIVO tem cargo
-- ════════════════════════════════════════════
create or replace function public.get_my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() and ativo limit 1;
$$;

-- Signup cria perfil inativo — admin libera em /equipe
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'vendedor'::public.user_role,
    false
  );
  return new;
end;
$$;

-- ════════════════════════════════════════════
-- 2. profiles: role / comissao_pct / ativo só por admin
-- ════════════════════════════════════════════
create or replace function public.proteger_campos_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- service_role / SQL editor não têm auth.uid()
  if auth.uid() is null then
    return new;
  end if;

  if (new.id, new.role, new.comissao_pct, new.ativo)
     is distinct from (old.id, old.role, old.comissao_pct, old.ativo)
     and coalesce(public.get_my_role(), '') <> 'admin' then
    raise exception 'Apenas admin pode alterar cargo, comissão ou status'
      using errcode = '42501';
  end if;

  -- Nunca deixar o sistema sem admin ativo
  if old.role = 'admin' and old.ativo
     and (new.role <> 'admin' or not new.ativo)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and ativo and id <> old.id
     ) then
    raise exception 'Não é possível remover o último admin ativo';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_proteger_campos on profiles;
create trigger profiles_proteger_campos
  before update on profiles
  for each row execute function public.proteger_campos_profile();

drop policy if exists "profiles_select_auth" on profiles;
create policy "profiles_select_auth" on profiles
  for select using (id = auth.uid() or public.get_my_role() is not null);

drop policy if exists "profiles_update_admin_safe" on profiles;
create policy "profiles_update_admin_safe" on profiles
  for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ════════════════════════════════════════════
-- 3. produtos: custo invisível para não-admin
-- RLS filtra linhas; para esconder coluna é preciso GRANT por coluna.
-- Admin lê custo via listar_produtos_admin().
-- ════════════════════════════════════════════
revoke select on produtos from anon, authenticated;
grant select (id, nome, sku, preco_venda, estoque, ativo, created_at, updated_at)
  on produtos to authenticated;

drop policy if exists "produtos_select_authenticated" on produtos;
drop policy if exists "produtos_select_admin_all"     on produtos;
-- Todos os usuários ativos veem todos os produtos (inclusive inativos,
-- para histórico/recibo). A tela de venda filtra ativo = true.
create policy "produtos_select_ativos" on produtos
  for select using (public.get_my_role() is not null);

create or replace function public.listar_produtos_admin()
returns setof produtos
language plpgsql stable security definer
set search_path = public
as $$
begin
  if coalesce(public.get_my_role(), '') <> 'admin' then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  return query select * from produtos order by nome;
end;
$$;

-- ════════════════════════════════════════════
-- 4. vendas: escrita só pela RPC; UPDATE só de pagamento/observação
-- ════════════════════════════════════════════
revoke insert, update, delete on vendas from anon, authenticated;
revoke select on vendas from anon;
grant update (forma_pagamento, observacao) on vendas to authenticated;
grant delete on vendas to authenticated;

drop policy if exists "vendas_insert"          on vendas;
drop policy if exists "vendas_delete_proprio"  on vendas;
drop policy if exists "vendas_delete_admin"    on vendas;
drop policy if exists "vendas_select_proprio"  on vendas;
drop policy if exists "vendas_update"          on vendas;

create policy "vendas_select_proprio" on vendas
  for select using (vendedor_id = auth.uid() and public.get_my_role() is not null);

create policy "vendas_delete_admin" on vendas
  for delete using (public.get_my_role() = 'admin');

create policy "vendas_update" on vendas
  for update
  using (
    public.get_my_role() = 'admin'
    or (vendedor_id = auth.uid() and public.get_my_role() is not null)
  )
  with check (
    public.get_my_role() = 'admin'
    or (vendedor_id = auth.uid() and public.get_my_role() is not null)
  );

-- ════════════════════════════════════════════
-- 5. venda_itens: sem escrita direta, sem custo para não-admin
-- ════════════════════════════════════════════
revoke all on venda_itens from anon;
revoke insert, update, delete on venda_itens from authenticated;
revoke select on venda_itens from authenticated;
grant select (id, venda_id, produto_id, qtd, preco_unitario, desconto_item, created_at)
  on venda_itens to authenticated;

drop policy if exists "venda_itens_insert" on venda_itens;

-- ════════════════════════════════════════════
-- 6. cupons: só usuários ativos leem
-- ════════════════════════════════════════════
revoke all on cupons from anon;
drop policy if exists "cupons_select_auth" on cupons;
create policy "cupons_select_auth" on cupons
  for select using (public.get_my_role() is not null);

-- ════════════════════════════════════════════
-- 7. Número sequencial do recibo
-- Backfill na ordem cronológica (mesma numeração que o admin via antes)
-- ════════════════════════════════════════════
alter table vendas add column if not exists numero bigint;

with n as (
  select id, row_number() over (order by created_at, id) as rn from vendas
)
update vendas v set numero = n.rn from n where n.id = v.id and v.numero is null;

create sequence if not exists vendas_numero_seq owned by vendas.numero;
select setval('vendas_numero_seq', coalesce((select max(numero) from vendas), 0) + 1, false);

alter table vendas
  alter column numero set default nextval('vendas_numero_seq'),
  alter column numero set not null;

create unique index if not exists vendas_numero_key on vendas(numero);

-- ════════════════════════════════════════════
-- 8. criar_venda_completa: preço e custo vêm da tabela produtos
-- ════════════════════════════════════════════
drop function if exists public.criar_venda_completa(forma_pagamento, numeric, text, jsonb);

create or replace function public.criar_venda_completa(
  p_forma_pagamento forma_pagamento,
  p_desconto        numeric,   -- desconto manual na venda (R$)
  p_observacao      text,
  p_itens           jsonb,     -- [{produto_id, qtd, desconto_item}] — preço/custo ignorados
  p_cupon_id        uuid default null
)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_venda_id        uuid;
  v_numero          bigint;
  v_total_bruto     numeric := 0;
  v_desconto_itens  numeric := 0;
  v_desconto_cupon  numeric := 0;
  v_desconto_manual numeric := coalesce(p_desconto, 0);
  v_desconto_total  numeric;
  v_total_final     numeric;
  v_item            jsonb;
  v_linhas          jsonb := '[]'::jsonb;
  v_prod            record;
  v_qtd             integer;
  v_desc_item       numeric;
  v_cupon           record;
begin
  if public.get_my_role() is null then
    raise exception 'Usuário inativo ou sem perfil' using errcode = '42501';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Venda sem itens';
  end if;

  if v_desconto_manual < 0 then
    raise exception 'Desconto inválido';
  end if;

  -- Preço e custo SEMPRE do cadastro de produtos
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_qtd       := (v_item->>'qtd')::integer;
    v_desc_item := coalesce((v_item->>'desconto_item')::numeric, 0);

    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select id, nome, preco_venda, custo, ativo into v_prod
    from produtos where id = (v_item->>'produto_id')::uuid;

    if not found then
      raise exception 'Produto não encontrado';
    end if;
    if not v_prod.ativo then
      raise exception 'Produto inativo: %', v_prod.nome;
    end if;
    if v_desc_item < 0 or v_desc_item > v_prod.preco_venda * v_qtd then
      raise exception 'Desconto inválido no item %', v_prod.nome;
    end if;

    v_total_bruto    := v_total_bruto + v_prod.preco_venda * v_qtd;
    v_desconto_itens := v_desconto_itens + v_desc_item;
    v_linhas := v_linhas || jsonb_build_object(
      'produto_id', v_prod.id, 'qtd', v_qtd,
      'preco', v_prod.preco_venda, 'custo', v_prod.custo, 'desconto_item', v_desc_item
    );
  end loop;

  -- Cupom: trava a linha para o limite de usos ser atômico
  if p_cupon_id is not null then
    select * into v_cupon from cupons where id = p_cupon_id and ativo for update;

    if not found then
      raise exception 'Cupom inválido ou inativo';
    end if;
    if v_cupon.validade_em is not null and v_cupon.validade_em < now() then
      raise exception 'Cupom expirado';
    end if;
    if v_cupon.uso_maximo is not null and v_cupon.usos >= v_cupon.uso_maximo then
      raise exception 'Cupom esgotado (limite de % usos atingido)', v_cupon.uso_maximo;
    end if;

    if v_cupon.tipo = 'percentual' then
      v_desconto_cupon := round((v_total_bruto - v_desconto_itens) * (v_cupon.valor / 100), 2);
    else
      v_desconto_cupon := least(v_cupon.valor, v_total_bruto - v_desconto_itens);
    end if;

    update cupons set usos = usos + 1 where id = p_cupon_id;
  end if;

  v_desconto_total := v_desconto_itens + v_desconto_cupon + v_desconto_manual;
  v_total_final    := v_total_bruto - v_desconto_total;

  if v_total_final < 0 then
    raise exception 'Desconto total maior que o subtotal da venda';
  end if;

  insert into vendas (vendedor_id, total, desconto, forma_pagamento, observacao, cupon_id)
  values (auth.uid(), v_total_final, v_desconto_total, p_forma_pagamento,
          nullif(trim(p_observacao), ''), p_cupon_id)
  returning id, numero into v_venda_id, v_numero;

  insert into venda_itens (venda_id, produto_id, qtd, preco_unitario, custo_unitario, desconto_item)
  select v_venda_id, (l->>'produto_id')::uuid, (l->>'qtd')::integer,
         (l->>'preco')::numeric, (l->>'custo')::numeric, (l->>'desconto_item')::numeric
  from jsonb_array_elements(v_linhas) l;

  return json_build_object(
    'venda_id',       v_venda_id,
    'numero',         v_numero,
    'total',          v_total_final,
    'desconto_total', v_desconto_total
  );
end;
$$;

-- ════════════════════════════════════════════
-- 9. Dashboard: dados com custo, só admin
-- (mesmo formato que o select aninhado do PostgREST retornava)
-- ════════════════════════════════════════════
create or replace function public.dashboard_vendas(p_desde timestamptz)
returns json
language plpgsql stable security definer
set search_path = public
as $$
begin
  if coalesce(public.get_my_role(), '') <> 'admin' then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  return (
    select coalesce(json_agg(json_build_object(
      'id',              v.id,
      'total',           v.total,
      'desconto',        v.desconto,
      'forma_pagamento', v.forma_pagamento,
      'vendedor_id',     v.vendedor_id,
      'created_at',      v.created_at,
      'profiles',        json_build_object('nome', p.nome),
      'venda_itens',     coalesce((
        select json_agg(json_build_object(
          'qtd',            vi.qtd,
          'preco_unitario', vi.preco_unitario,
          'custo_unitario', vi.custo_unitario,
          'produtos',       json_build_object('nome', pr.nome)
        ))
        from venda_itens vi
        left join produtos pr on pr.id = vi.produto_id
        where vi.venda_id = v.id
      ), '[]'::json)
    ) order by v.created_at desc), '[]'::json)
    from vendas v
    left join profiles p on p.id = v.vendedor_id
    where v.created_at >= p_desde
  );
end;
$$;

-- ════════════════════════════════════════════
-- 10. search_path fixo e EXECUTE só para authenticated
-- ════════════════════════════════════════════
alter function public.decrementar_estoque() set search_path = public;
alter function public.restaurar_estoque()   set search_path = public;
alter function public.set_updated_at()      set search_path = public;

revoke execute on function public.criar_venda_completa(forma_pagamento, numeric, text, jsonb, uuid) from public, anon;
revoke execute on function public.listar_produtos_admin() from public, anon;
revoke execute on function public.dashboard_vendas(timestamptz) from public, anon;
revoke execute on function public.proteger_campos_profile() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.criar_venda_completa(forma_pagamento, numeric, text, jsonb, uuid) to authenticated;
grant execute on function public.listar_produtos_admin() to authenticated;
grant execute on function public.dashboard_vendas(timestamptz) to authenticated;
