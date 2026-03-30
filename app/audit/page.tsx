'use client';
// app/audit/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Btn from '@/components/Btn';
import { useStore } from '@/lib/store';

const TYPE_ICON: Record<string, string> = { Login: '🔐', Criação: '➕', Edição: '✏️', Exclusão: '🗑️', Exportação: '📤' };
const TYPE_PILL: Record<string, string> = { Login: 'pill-blue', Criação: 'pill-green', Edição: 'pill-yellow', Exclusão: 'pill-red', Exportação: 'pill-gray' };

export default function AuditPage() {
  const { auditLog } = useStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const filtered = useMemo(() => auditLog.filter((a) => {
    if (search && !a.detail.toLowerCase().includes(search.toLowerCase()) && !a.action.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && a.type !== filterType) return false;
    return true;
  }), [auditLog, search, filterType]);

  return (
    <AppShell>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Auditoria</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Log de todas as ações realizadas no sistema</div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {['Login', 'Criação', 'Edição', 'Exclusão', 'Exportação'].map((type) => (
          <div key={type} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 16px', cursor: 'pointer' }}
            onClick={() => setFilterType(filterType === type ? '' : type)}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{TYPE_ICON[type]}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{auditLog.filter((a) => a.type === type).length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{type}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input className="field-input" style={{ paddingLeft: 36 }} type="text" placeholder="Buscar no log..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field-input" style={{ width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todas as ações</option>
            <option>Login</option><option>Criação</option><option>Edição</option><option>Exclusão</option><option>Exportação</option>
          </select>
          {(search || filterType) && <Btn size="sm" onClick={() => { setSearch(''); setFilterType(''); }}>Limpar</Btn>}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🔍</div>
            Nenhum log encontrado
          </div>
        ) : filtered.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 50, paddingTop: 2 }}>{a.time}</div>
            <div style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[a.type] ?? '•'}</div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{a.user_email}</span>
              <span style={{ color: 'var(--text-muted)' }}> · </span>
              <span className={`pill ${TYPE_PILL[a.type] ?? 'pill-gray'}`} style={{ padding: '1px 8px', fontSize: 10 }}>{a.action}</span>
              <span style={{ color: 'var(--text-muted)' }}> · </span>
              <span>{a.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
