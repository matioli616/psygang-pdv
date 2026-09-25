-- ============================================================
-- PONTOS DE VENDA: Loja + Barraca (mesmo catálogo, sem estoque separado)
-- Cada venda registra onde aconteceu; dashboard/histórico filtram por ponto.
-- ============================================================

create table if not exists pontos_venda (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  ativo      boolean not null default true,
  ordem      smallint not null default 0,   -- ordem dos botões na UI
  created_at timestamptz default now()
);

alter table pontos_venda enable row level security;
revoke all on pontos_venda from anon;

create policy "pontos_venda_select" on pontos_venda
  for select using (public.get_my_role() is not null);
create policy "pontos_venda_insert_admin" on pontos_venda
  for insert with check (public.get_my_role() = 'admin');
create policy "pontos_venda_update_admin" on pontos_venda
  for update using (public.get_my_role() = 'admin');
create policy "pontos_venda_delete_admin" on pontos_venda
  for delete using (public.get_my_role() = 'admin');

insert into pontos_venda (nome, ordem) values ('Loja', 1), ('Barraca', 2)
on conflict (nome) do nothing;

-- ── vendas.ponto_venda_id — histórico inteiro era da Loja ──
alter table vendas
  add column if not exists ponto_venda_id uuid references pontos_venda(id) on delete restrict;

update vendas set ponto_venda_id = (select id from pontos_venda where nome = 'Loja')
where ponto_venda_id is null;

alter table vendas alter column ponto_venda_id set not null;

create index if not exists idx_vendas_ponto_data on vendas(ponto_venda_id, created_at desc);

-- ════════════════════════════════════════════
-- criar_venda_completa: + p_ponto_venda_id
-- Parâmetro com default null só para a assinatura ser compatível com
-- chamadas nomeadas; a função recusa venda sem ponto.
-- ════════════════════════════════════════════
drop function if exists public.criar_venda_completa(forma_pagamento, numeric, text, jsonb, uuid);

create or replace function public.criar_venda_completa(
  p_forma_pagamento forma_pagamento,
  p_desconto        numeric,   -- desconto manual na venda (R$)
  p_observacao      text,
  p_itens           jsonb,     -- [{produto_id, qtd, desconto_item}] — preço/custo ignorados
  p_cupon_id        uuid default null,
  p_ponto_venda_id  uuid default null
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

  if p_ponto_venda_id is null then
    raise exception 'Selecione o ponto de venda';
  end if;
  if not exists (select 1 from pontos_venda where id = p_ponto_venda_id and ativo) then
    raise exception 'Ponto de venda inválido ou inativo';
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

  insert into vendas (vendedor_id, total, desconto, forma_pagamento, observacao, cupon_id, ponto_venda_id)
  values (auth.uid(), v_total_final, v_desconto_total, p_forma_pagamento,
          nullif(trim(p_observacao), ''), p_cupon_id, p_ponto_venda_id)
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
-- dashboard_vendas: + ponto_venda_id
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
      'ponto_venda_id',  v.ponto_venda_id,
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

revoke execute on function public.criar_venda_completa(forma_pagamento, numeric, text, jsonb, uuid, uuid) from public, anon;
grant execute on function public.criar_venda_completa(forma_pagamento, numeric, text, jsonb, uuid, uuid) to authenticated;
