'use client';
// components/AppShell.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Notifications from './Notifications';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const isMaster = localStorage.getItem('isMasterAuthenticated') === 'true';

      if (!isMaster) {
        router.push('/login');
      } else {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  if (checking) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 150,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, padding: 8, cursor: 'pointer', fontSize: 18,
          color: 'var(--text-primary)',
        }}
        className="menu-toggle"
      >☰</button>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={{ marginLeft: 240, padding: 32, minHeight: '100vh' }} className="main-content">
        {children}
      </main>

      <Notifications />

      <style>{`
        @media (max-width: 768px) {
          .menu-toggle { display: block !important; }
          .main-content { margin-left: 0 !important; padding: 16px !important; padding-top: 60px !important; }
        }
      `}</style>
    </div>
  );
}
