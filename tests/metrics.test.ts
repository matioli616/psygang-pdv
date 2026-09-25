// Rodar com: npm test  (Node 24 executa TypeScript nativamente)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcKPIs, calcComissao, calcVariacao, filtrarPorPonto, calcKPIsPorPonto } from '../lib/metrics.ts'

// Venda de R$ 100 bruto com R$ 10 de desconto → total gravado = 90
const vendas = [
  { total: 90, venda_itens: [{ qtd: 2, custo_unitario: 20 }] },   // CPV 40
  { total: 60, venda_itens: [{ qtd: 1, custo_unitario: 30 }] },   // CPV 30
]

test('faturamento soma vendas.total (já líquido de desconto)', () => {
  assert.equal(calcKPIs(vendas).faturamento, 150)
})

test('CPV = custo_unitario * qtd', () => {
  assert.equal(calcKPIs(vendas).cpv, 70)
})

test('lucro não desconta o desconto duas vezes', () => {
  // 150 - 70 = 80. A versão antiga subtraía o desconto de novo.
  assert.equal(calcKPIs(vendas).lucro, 80)
})

test('margem e ticket médio', () => {
  const k = calcKPIs(vendas)
  assert.equal(Math.round(k.margem * 100) / 100, 53.33)
  assert.equal(k.ticketMedio, 75)
  assert.equal(k.total, 2)
})

test('sem vendas não divide por zero', () => {
  assert.deepEqual(calcKPIs([]), { faturamento: 0, cpv: 0, lucro: 0, margem: 0, ticketMedio: 0, total: 0 })
})

test('valores numeric vindos como string do Postgres', () => {
  const k = calcKPIs([{ total: '10.50' as unknown as number, venda_itens: [{ qtd: 1, custo_unitario: '4.25' as unknown as number }] }])
  assert.equal(k.faturamento, 10.5)
  assert.equal(k.lucro, 6.25)
})

test('comissão e variação', () => {
  assert.equal(calcComissao(1000, 5), 50)
  assert.equal(calcVariacao(110, 100), 10)
  assert.equal(calcVariacao(10, 0), null)
})

// ── Pontos de venda ──────────────────────────────
const LOJA = 'loja-id'
const BARRACA = 'barraca-id'
const vendasPontos = [
  { ponto_venda_id: LOJA,    total: 100, venda_itens: [{ qtd: 1, custo_unitario: 40 }] },
  { ponto_venda_id: LOJA,    total: 50,  venda_itens: [{ qtd: 1, custo_unitario: 20 }] },
  { ponto_venda_id: BARRACA, total: 30,  venda_itens: [{ qtd: 1, custo_unitario: 10 }] },
]

test('filtrarPorPonto: null devolve todas', () => {
  assert.equal(filtrarPorPonto(vendasPontos, null).length, 3)
  assert.equal(filtrarPorPonto(vendasPontos, BARRACA).length, 1)
})

test('KPIs por ponto somam o total geral', () => {
  const [loja, barraca] = calcKPIsPorPonto(vendasPontos, [
    { id: LOJA, nome: 'Loja' }, { id: BARRACA, nome: 'Barraca' },
  ])
  assert.equal(loja.kpis.faturamento, 150)
  assert.equal(loja.kpis.lucro, 90)
  assert.equal(barraca.kpis.faturamento, 30)
  assert.equal(barraca.kpis.ticketMedio, 30)
  assert.equal(loja.kpis.faturamento + barraca.kpis.faturamento, calcKPIs(vendasPontos).faturamento)
})

test('ponto sem vendas não quebra', () => {
  const [feira] = calcKPIsPorPonto(vendasPontos, [{ id: 'feira', nome: 'Feira' }])
  assert.equal(feira.kpis.total, 0)
  assert.equal(feira.kpis.margem, 0)
})
