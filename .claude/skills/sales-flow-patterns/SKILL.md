---
name: sales-flow-patterns
description: Use ao implementar fluxos de venda, carrinho de compras, registro de pedido, seleção de produtos, aplicação de desconto, escolha de forma de pagamento, ou geração de recibo. Acionar para qualquer feature relacionada ao ato de vender ou registrar venda.
---

# Sales Flow Patterns

## Estado do carrinho (Zustand)
```ts
type CartItem = {
  produto_id: string
  nome: string
  sku: string
  quantidade: number
  preco_unitario: number
  custo_unitario: number
}

type CartStore = {
  itens: CartItem[]
  desconto: number
  formaPagamento: FormaPagamento | null
  observacao: string
  
  adicionar: (produto: Produto) => void
  remover: (produto_id: string) => void
  alterarQtd: (produto_id: string, qtd: number) => void
  aplicarDesconto: (valor: number, tipo: 'reais' | 'percentual') => void
  total: () => number
  limpar: () => void
}
```

## Fluxo padrão "Nova Venda"
1. Buscar produto (autocomplete por nome/SKU)
2. Tocar produto > adiciona com qtd=1
3. Ajustar qtd com botões +/- (não input numérico, dedos)
4. Ver subtotal atualizado em tempo real
5. Aplicar desconto (opcional) — toggle R$ ou %
6. Selecionar forma de pagamento (4 botões grandes)
7. Observação (opcional)
8. Botão CONFIRMAR (grande, neon, fixo no bottom)
9. Loading > animação de sucesso > tela de recibo

## Validações obrigatórias antes de confirmar
- Pelo menos 1 item no carrinho
- Forma de pagamento selecionada
- Quantidade <= estoque disponível (avisar mas permitir override admin)
- Desconto <= subtotal

## Transação atômica (criar venda + itens + baixar estoque)
SEMPRE via RPC do Supabase, nunca via múltiplas calls:

```ts
const { data, error } = await supabase.rpc('criar_venda', {
  p_itens: itens,
  p_desconto: desconto,
  p_forma_pagamento: forma,
  p_observacao: obs
})
```

Se UMA coisa falhar, tudo é revertido.

## Recibo (após sucesso)
- Número da venda (#0042)
- Data/hora
- Vendedor
- Lista de itens + total
- Forma de pagamento
- Botões:
  - "Nova Venda" (volta pra busca)
  - "Compartilhar WhatsApp" (wa.me com texto formatado)
  - "Imprimir" (window.print com CSS print)

## Edge cases
- Conexão caiu durante venda > salvar local (IndexedDB) e sincronizar depois
- Produto sem estoque > mostrar mas bloquear adição (override admin)
- Venda duplicada acidental > debounce 2s no botão confirmar
- Vendedor sai no meio > carrinho persiste por 30min então limpa

## Microcopy PsyGang
- Botão venda: "FECHAR VENDA" (não "finalizar")
- Sucesso: "VENDA NA CONTA"
- Erro estoque: "esse drop tá zerado"
- Empty carrinho: "carrinho vazio, partiu vender?"
