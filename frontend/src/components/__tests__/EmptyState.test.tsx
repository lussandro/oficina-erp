import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('diz o próximo passo, não só que está vazio', () => {
    render(
      <EmptyState
        title="Nenhum cliente cadastrado"
        description="Cadastre o primeiro cliente para abrir uma ordem de serviço."
      />,
    );
    expect(screen.getByText('Nenhum cliente cadastrado')).toBeInTheDocument();
    expect(
      screen.getByText('Cadastre o primeiro cliente para abrir uma ordem de serviço.'),
    ).toBeInTheDocument();
  });
});
