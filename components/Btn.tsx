'use client';
// components/Btn.tsx
import { CSSProperties, ReactNode } from 'react';

type BtnVariant = 'gold' | 'outline' | 'danger' | 'success';

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}

const styles: Record<BtnVariant, CSSProperties> = {
  gold:    { background: 'var(--gold)',                        color: '#000000',                  border: 'none', boxShadow: '0 4px 14px 0 rgba(212, 175, 55, 0.39)' },
  outline: { background: 'rgba(255,255,255,0.03)',             color: 'var(--text-secondary)',    border: '1px solid var(--border)' },
  danger:  { background: 'rgba(239,68,68,0.1)',               color: '#f87171',                  border: '1px solid rgba(239,68,68,0.2)' },
  success: { background: 'rgba(16,185,129,0.1)',               color: '#34d399',                  border: '1px solid rgba(16,185,129,0.2)' },
};

export default function Btn({ children, onClick, variant = 'outline', size = 'md', disabled, type = 'button', style }: BtnProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: size === 'sm' ? '6px 14px' : '10px 22px',
        borderRadius: 12,
        fontFamily: 'Outfit, sans-serif',
        fontSize: size === 'sm' ? 12 : 14,
        letterSpacing: size === 'sm' ? '0.2px' : '0',
        fontWeight: size === 'sm' ? 700 : 600, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', opacity: disabled ? 0.6 : 1,
        ...styles[variant],
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled && variant === 'gold') (e.currentTarget.style.transform = 'translateY(-1px)'); if (!disabled && variant === 'outline') (e.currentTarget.style.borderColor = 'var(--gold)'); }}
      onMouseLeave={(e) => { if (!disabled && variant === 'gold') (e.currentTarget.style.transform = 'translateY(0)'); if (!disabled && variant === 'outline') (e.currentTarget.style.borderColor = 'var(--border)'); }}
    >
      {children}
    </button>
  );
}
