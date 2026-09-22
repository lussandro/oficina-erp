import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../Button';

describe('Button', () => {
  it('renderiza o texto e usa type=button por padrão', () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeEnabled();
  });

  it('bloqueia e anuncia o giro quando loading', () => {
    render(<Button loading>Entrar</Button>);
    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('aplica a variante de perigo', () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole('button', { name: 'Excluir' }).className).toContain('bg-danger');
  });
});
