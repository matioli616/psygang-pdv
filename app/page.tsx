import { redirect } from 'next/navigation'

// Redireciona raiz → dashboard (middleware protege se não autenticado)
export default function Home() {
  redirect('/dashboard')
}
