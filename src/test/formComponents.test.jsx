import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from '../components/Button';
import Input from '../components/Input';

describe('ortak form bileşenleri', () => {
  it('button varsayılan olarak formu göndermeyen gerçek butondur', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kaydet</Button>);
    const button = screen.getByRole('button', { name: 'Kaydet' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('hata mesajını input ile erişilebilir biçimde ilişkilendirir', () => {
    render(<Input label="Telefon" error="Telefon geçersiz" />);
    const input = screen.getByRole('textbox', { name: 'Telefon' });
    const error = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('button görünümünü bağlantı semantiğiyle kullanabilir', () => {
    render(<Button as="a" href="/hedef">Devam</Button>);
    expect(screen.getByRole('link', { name: 'Devam' })).toHaveAttribute('href', '/hedef');
  });
});
