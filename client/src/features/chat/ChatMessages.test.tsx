// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from './ChatMessages';

describe('ChatMessages', () => {
  it('renderiza mensagem do usuário', () => {
    render(
      <ChatMessages
        messages={[{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Olá mundo' }] }]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Olá mundo')).toBeInTheDocument();
  });

  it('renderiza mensagem do assistente', () => {
    render(
      <ChatMessages
        messages={[{ id: 'm2', role: 'assistant', parts: [{ type: 'text', text: 'Resposta aqui' }] }]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Resposta aqui')).toBeInTheDocument();
  });

  it('exibe indicador de carregamento quando isLoading=true', () => {
    const { container } = render(
      <ChatMessages messages={[]} isLoading={true} />
    );
    // Three bouncing dots rendered as empty spans with animate-bounce
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('oculta dots de carregamento quando já existe mensagem do assistente', () => {
    const { container } = render(
      <ChatMessages
        messages={[{ id: 'm1', role: 'assistant', parts: [{ type: 'text', text: 'Olá' }] }]}
        isLoading={true}
      />
    );
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(0);
  });
});
