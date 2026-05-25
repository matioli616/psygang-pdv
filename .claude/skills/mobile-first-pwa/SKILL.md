---
name: mobile-first-pwa
description: Use ao desenvolver qualquer tela, layout responsivo ou ao configurar PWA. Acionar quando o usuário mencionar mobile, celular, app, instalar na home screen, responsivo, ou ao criar qualquer página visível pelo usuário final. Garante que o sistema funcione perfeitamente em celular como prioridade.
---

# Mobile-First PWA

## Princípios
- Design no 375px primeiro, expande pra desktop depois
- Toque > clique: botões >= 48px altura, alvos >= 44px
- Polegar manda: ações principais na parte BAIXA da tela
- Texto base 16px+ (evita zoom no iOS)
- Sem hover-only: tudo precisa funcionar no toque

## Layout pattern
```tsx
<div className="min-h-dvh flex flex-col">
  <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur" />
  <main className="flex-1 pb-20 px-4" />
  <BottomNav className="fixed bottom-0" />
</div>
```

Sempre min-h-dvh (não min-h-screen) — respeita barra de URL no mobile.

## PWA setup
1. Instalar next-pwa ou usar manifest manual em /app/manifest.ts
2. Ícones: 192x192 e 512x512 (gerar em roxo neon com logo PsyGang)
3. theme_color: '#0a0a0a', background_color: '#0a0a0a'
4. display: 'standalone' (esconde URL bar quando instalado)
5. Service worker pra cache offline básico (lista de produtos)

## Componentes mobile-friendly
- Bottom Sheet pra modais (não modal centralizado)
- Pull-to-refresh em listas
- Swipe pra deletar item do carrinho
- Inputs com inputMode correto: numeric, decimal, tel, email
- autoComplete="off" em campos sensíveis

## Performance no celular
- Lazy load de imagens (next/image)
- Suspense boundaries em queries
- Skeleton enquanto carrega (não spinner)
- Evitar bibliotecas pesadas — preferir nativo

## Teste obrigatório
Toda feature precisa funcionar em:
- iPhone SE (375px, menor tela comum)
- Android médio (Chrome)
- Modo standalone (PWA instalada)
