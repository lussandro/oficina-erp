import { redirect } from 'next/navigation';

/** A raiz não tem sessão: quem chega aqui é mandado para o login. */
export default function Home() {
  redirect('/login');
}
