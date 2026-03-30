'use client';
// components/Sidebar.tsx
import { useRouter, usePathname } from 'next/navigation';

const NAV = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard', section: 'Principal' },
  { icon: '👤', label: 'Funcionário', href: '/employees', section: 'Módulos' },
  { icon: '📋', label: 'Absenteísmo', href: '/absences', section: 'Módulos' },
  { icon: '⏱️', label: 'Hora Extra', href: '/overtime', section: 'Módulos' },
  { icon: '📅', label: 'Hora Extra / Fim de Semana', href: '/overtime-saturday', section: 'Módulos' },
  { icon: '📤', label: 'Relatórios', href: '/reports', section: 'Sistema' },
  { icon: '🔍', label: 'Auditoria', href: '/audit', section: 'Sistema' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  let lastSection = '';

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function logout() {
    router.push('/login');
  }

  return (
    <>
      {/* overlay mobile */}
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 90,
          backdropFilter: 'blur(4px)', display: 'block',
        }} className="mobile-overlay" />
      )}

      <nav style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
        background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }} className="sidebar-nav">
        {/* Header - Logo */}
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
            <img src="/icons/icon-192.png" alt="CorpFlow" style={{ width: 42, height: 42, borderRadius: 10, boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)' }} />
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.8, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
              Corp<span style={{ color: 'var(--gold)' }}>Flow</span>
            </span>
          </div>
        </div>

        {/* Scrollable Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px', scrollbarWidth: 'thin' }} className="custom-scrollbar">
          {NAV.map((item) => {
            const showSection = item.section !== lastSection;
            if (showSection) lastSection = item.section;
            const active = pathname === item.href;
            return (
              <div key={item.href}>
                {showSection && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 12px',
                    margin: '24px 0 8px', fontFamily: 'Outfit, sans-serif' }}>{item.section}</div>
                )}
                <div onClick={() => navigate(item.href)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  marginBottom: 4, border: '1px solid transparent',
                  background: active ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--text-secondary)',
                  borderColor: active ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: 'Outfit, sans-serif'
                }}>
                  <span style={{ fontSize: 18, width: 22, textAlign: 'center', opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer - fixed at bottom */}
        <div style={{ padding: '16px 16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold) 0%, #ae8625 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: '#000', border: '2px solid rgba(255,255,255,0.1)' }}>LC</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>Lucas Carvalho</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Gestor Administrativo</div>
            </div>
          </div>
          <button onClick={logout} style={{
            width: '100%', marginTop: 12, background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '10px',
            color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
          >
            Sair do sistema
          </button>
        </div>
      </nav>
    </>
  );
}
