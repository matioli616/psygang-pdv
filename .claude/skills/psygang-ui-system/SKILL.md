---
name: psygang-ui-system
description: Use SEMPRE ao criar qualquer interface visual, tela, componente, página ou estilizar elemento UI do projeto PsyGang. Acionar para botões, cards, formulários, modais, headers, cores, tipografia, layout, espaçamento, e qualquer decisão de design. Garante que tudo siga a identidade alien/streetwear da marca.
---

# PsyGang UI System

## Identidade
Streetwear alienígena, psicodélico, underground. Dark mode SEMPRE.
Aparência: limpa pra usar, mas com toques neon e detalhes que remetem ao oculto.

## Tokens (tailwind.config.ts)
```ts
colors: {
  bg: {
    DEFAULT: '#0a0a0a',
    elevated: '#141414',
    overlay: '#1c1c1c',
  },
  neon: {
    purple: '#B026FF',
    green: '#39FF14',
    pink: '#FF10F0',
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1A1',
    muted: '#666',
  }
}
fontFamily: {
  display: ['Bebas Neue', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

## Regras de componente

### Botão primário
- Fundo neon.purple, texto preto, font-display, uppercase, tracking-wider
- active:scale-95 transition-transform (feedback tátil mobile)
- Altura mínima 48px (mobile-first, dedo grande)
- Shadow: shadow-[0_0_20px_rgba(176,38,255,0.4)] no hover

### Card
- bg-bg-elevated rounded-2xl p-4 border border-white/5
- Hover: borda vira border-neon-purple/30

### Input
- bg-bg-overlay border border-white/10 rounded-xl px-4 py-3
- Focus: borda neon-purple, glow sutil
- Texto grande (16px+) pra não dar zoom no iOS

### Tipografia hierárquica
- H1 página: text-4xl font-display uppercase tracking-wide
- Valores monetários: font-mono text-neon-green
- Labels: text-xs uppercase tracking-widest text-text-muted

## Padrões obrigatórios
- TODA tela mobile-first (design pra 375px primeiro)
- Bottom nav fixo em telas autenticadas (4-5 ícones max)
- Header com saudação personalizada + avatar do vendedor
- Loading states: skeleton com pulse roxo, NUNCA spinner genérico
- Empty states com ilustração ou ícone grande + CTA

## Microinterações
- Toda ação confirmada → toast no topo, slide-down, auto-dismiss 3s
- Venda confirmada → animação de "explosão neon" (use framer-motion)
- Numbers animados (count-up) em KPIs do dashboard

## NUNCA
- Cores fora da paleta (sem azul, sem amarelo padrão)
- Sombras pretas pesadas (use glow neon ao invés)
- Border-radius diferente de: rounded-xl, rounded-2xl ou rounded-full
- Emojis em UI séria
