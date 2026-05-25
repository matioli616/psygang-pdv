---
name: dashboard-metrics
description: Use ao criar dashboards, gráficos, KPIs, relatórios de vendas, cálculos financeiros (lucro, margem, ticket médio, comissão) ou qualquer visualização de dados. Acionar para Recharts, comparativos de período, rankings de vendedores, top produtos, ou métricas de negócio.
---

# Dashboard Metrics

## Fórmulas oficiais do projeto

```ts
// Faturamento bruto
faturamento = SUM(vendas.total)

// CPV (custo dos produtos vendidos)
cpv = SUM(venda_itens.custo_unitario * venda_itens.quantidade)

// Lucro bruto
lucro = faturamento - cpv - SUM(vendas.desconto)

// Margem %
margem = (lucro / faturamento) * 100

// Ticket médio
ticket_medio = faturamento / COUNT(vendas)

// Comissão por vendedor
comissao = vendedor.faturamento * (vendedor.comissao_pct / 100)
```

Importante: sempre usar preco_unitario e custo_unitario da venda_itens (snapshot), nunca do produto atual.

## Padrão de KPI Card
```tsx
<KpiCard
  label="Faturamento"
  value={formatBRL(faturamento)}
  delta={+12.5}
  trend="up"
  sparkline={ultimasSete}
/>
```
- Verde neon se positivo, rosa neon se negativo
- Sempre mostrar comparativo (hoje vs ontem, mês vs mês passado)
- Animar números (count-up de 0 ao valor real)

## Gráficos padrão (Recharts)

### Linha (faturamento ao longo do tempo)
- Cor: gradient roxo > rosa neon
- Grid sutil (white/5)
- Tooltip customizado dark com valor em BRL

### Barras (ranking vendedores)
- Cor: roxo neon, barra do líder em verde neon
- Mostrar valor no topo de cada barra
- Ordenado decrescente

### Pizza (formas de pagamento)
- Paleta: roxo, verde, rosa, ciano
- Donut (innerRadius 60%)
- Legenda com % e valor

## Queries otimizadas
Para dashboard, criar VIEW no Postgres:
```sql
create view vendas_resumo as
select 
  date_trunc('day', created_at) as dia,
  vendedor_id,
  count(*) as qtd_vendas,
  sum(total) as faturamento,
  sum(desconto) as descontos
from vendas
group by 1, 2;
```

## Formatação
- Moeda: Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
- Data: format(date, "dd 'de' MMMM", { locale: ptBR })
- %: (valor).toFixed(1) + '%'

## Filtros de período padrão
Hoje | Ontem | Últimos 7 dias | Mês atual | Mês passado | Customizado
