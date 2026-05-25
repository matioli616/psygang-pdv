---
name: nextjs-supabase-setup
description: Use ao configurar Next.js 14 com Supabase (auth, database, RLS). Acionar quando o usuário pedir setup inicial do projeto, criar cliente Supabase, configurar autenticação, middleware de proteção de rotas, ou ao trabalhar com Server Components que acessam Supabase. Também usar para resolver problemas de cookies/sessão.
---

# Next.js 14 + Supabase Setup

## Stack obrigatória
- Next.js 14 App Router (NUNCA Pages Router)
- TypeScript estrito
- @supabase/ssr (NUNCA @supabase/auth-helpers — está deprecated)
- Server Components por padrão, Client só quando precisar de estado/eventos

## Estrutura de clients (sempre 2 arquivos separados)

### /lib/supabase/client.ts (browser)
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### /lib/supabase/server.ts (server components/actions)
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        }
      }
    }
  )
}
```

## Middleware obrigatório (/middleware.ts)
Sempre proteger rotas (app) exigindo sessão. Redireciona pra /login se não autenticado.

## Regras de ouro
- NUNCA use SUPABASE_SERVICE_ROLE_KEY no client
- SEMPRE valide role do usuário no server antes de mostrar dados sensíveis
- Use RLS no Supabase como segunda camada (não confie só no app)
- Server Actions pra mutations, não API routes (mais simples)

## Padrão de erro
Toda função que chama Supabase retorna { data, error }. Trate erro SEMPRE:
```ts
const { data, error } = await supabase.from('vendas').select()
if (error) return { error: error.message }
```
