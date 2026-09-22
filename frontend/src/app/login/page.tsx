'use client';

import { Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { LoginResponse, postJson } from '@/lib/api';
import { setToken } from '@/lib/session';

/**
 * Tela pública de login. O backend do Épico 2 já entrega `POST /auth/login`;
 * a sessão completa (refresh, expiração, guarda de rota) entra no épico de
 * autenticação do frontend — aqui o token é guardado para as telas internas
 * conseguirem chamar a API.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { accessToken } = await postJson<LoginResponse>('/auth/login', {
        email,
        password,
      });
      setToken(accessToken);
      router.push('/estoque');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      {/* Sem logo fornecido pelo cliente: a marca vai em tipografia. O arquivo
          de logo real continua pendente. */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Wrench className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Oficina ERP</h1>
        <p className="text-sm text-muted">Entre com a sua conta para continuar.</p>
      </div>

      <Card className="w-full max-w-sm" elevation="float">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorState title="Não foi possível entrar" message={error} />}

            <Field htmlFor="email" label="E-mail" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field htmlFor="password" label="Senha" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" loading={loading} fullWidth>
              Entrar
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
