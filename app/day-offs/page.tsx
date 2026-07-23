'use client';
// app/day-offs/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import StatCard from '@/components/StatCard';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { DayOff, DayOffStatus } from '@/types';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const STATUS_PILL: Record<DayOffStatus, string> = {
  'Pendente': 'pill-yellow',
  'Utilizada': 'pill-green',
  'Cancelada': 'pill-gray',
};

const STATUS_ICONS: Record<DayOffStatus, string> = {
  'Pendente': '⏳',
  'Utilizada': '✅',
  'Cancelada': '❌',
};

const STATUS_ALL: DayOffStatus[] = ['Pendente', 'Utilizada', 'Cancelada'];

const REASON_SUGGESTIONS = [
  'Trabalhou no domingo',
  'Trabalhou no feriado',
  'Trabalhou no sábado',
  'Banco de horas',
  'Compensação de horas extras',
];

export default function DayOffsPage() {
  const { employees, dayOffs, addDayOff, updateDayOff, deleteDayOff, addAudit } = useStore();
  const activeEmps = useMemo(() => employees.filter((e) => e.status === 'Ativo'), [employees]);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<DayOff, 'id' | 'created_at'>>({
    employee_id: activeEmps[0]?.id ?? 0,
    date: today(),
    reason: '',
    status: 'Pendente',
    observation: '',
  });

  const filtered = useMemo(() => dayOffs.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterEmp && String(d.employee_id) !== filterEmp) return false;
    if (filterMonth && !d.date.startsWith(filterMonth)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [dayOffs, filterStatus, filterEmp, filterMonth]);

  const stats = useMemo(() => ({
    pendentes: dayOffs.filter((d) => d.status === 'Pendente').length,
    utilizadas: dayOffs.filter((d) => d.status === 'Utilizada').length,
    canceladas: dayOffs.filter((d) => d.status === 'Cancelada').length,
    total: dayOffs.length,
  }), [dayOffs]);

  function openNew() {
    setEditId(null);
    setForm({ employee_id: activeEmps[0]?.id ?? 0, date: today(), reason: '', status: 'Pendente', observation: '' });
    setModalOpen(true);
  }

  function openEdit(d: DayOff) {
    setEditId(d.id);
    setForm({ employee_id: d.employee_id, date: d.date, reason: d.reason, status: d.status, observation: d.observation ?? '' });
    setModalOpen(true);
  }

  async function save() {
    if (!form.date || !form.employee_id || !form.reason.trim()) {
      notify('Preencha todos os campos obrigatórios', 'error'); return;
    }
    const emp = employees.find((e) => e.id === form.employee_id);
    try {
      if (editId) {
        await updateDayOff(editId, form);
        await addAudit({ user_email: 'Admin', action: 'Edição', detail: `Folga de ${emp?.name} atualizada`, type: 'Edição' });
        notify('Folga atualizada!');
      } else {
        await addDayOff(form);
        await addAudit({ user_email: 'Admin', action: 'Criação', detail: `Folga registrada para ${emp?.name}: ${form.reason}`, type: 'Criação' });
        notify('Folga registrada com sucesso!');
      }
      setModalOpen(false);
    } catch (e: any) {
      notify(e.message || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id: number) {
    try {
      await deleteDayOff(id);
      await addAudit({ user_email: 'Admin', action: 'Exclusão', detail: 'Registro de folga removido', type: 'Exclusão' });
      notify('Registro excluído');
    } catch (e: any) {
      notify(e.message || 'Erro ao excluir', 'error');
    }
  }

  async function markAs(id: number, status: DayOffStatus) {
    try {
      await updateDayOff(id, { status });
      notify(`Folga marcada como "${status}"`);
    } catch (e: any) {
      notify(e.message || 'Erro ao atualizar', 'error');
    }
  }

  const pendentesByEmp = useMemo(() => {
    const map: Record<number, number> = {};
    dayOffs.filter((d) => d.status === 'Pendente').forEach((d) => {
      map[d.employee_id] = (map[d.employee_id] || 0) + 1;
    });
    return map;
  }, [dayOffs]);

  const monthOptions = useMemo(() => {
    const months = new Set(dayOffs.map((d) => d.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [dayOffs]);

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>🗓️ Folgas</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Controle de folgas compensatórias dos colaboradores</div>
        </div>
        <Btn variant="gold" onClick={openNew}>+ Registrar Folga</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="⏳" value={stats.pendentes} label="Pendentes" accent="gold" />
        <StatCard icon="✅" value={stats.utilizadas} label="Utilizadas" accent="green" />
        <StatCard icon="❌" value={stats.canceladas} label="Canceladas" accent="red" />
        <StatCard icon="📊" value={stats.total} label="Total de registros" accent="blue" />
      </div>

      {/* Alert: pendentes por funcionário */}
      {Object.keys(pendentesByEmp).length > 0 && (
        <div style={{
          background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 16, padding: '16px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14, fontFamily: 'Outfit, sans-serif' }}>
            Folgas pendentes de uso:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(pendentesByEmp).map(([empId, count]) => {
              const emp = employees.find((e) => e.id === Number(empId));
              return (
                <span key={empId} style={{
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8, padding: '4px 12px', fontSize: 13, color: '#93c5fd', fontWeight: 600,
                }}>
                  {emp?.name ?? '—'} — {count} folga{count !== 1 ? 's' : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-premium" style={{ padding: 28 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field-input" style={{ width: 180 }} value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
            <option value="">Todos os funcionários</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="field-input" style={{ width: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_ALL.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="field-input" style={{ width: 140 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="">Todos os meses</option>
            {monthOptions.map((m) => {
              const [y, mo] = m.split('-');
              return <option key={m} value={m}>{`${mo}/${y}`}</option>;
            })}
          </select>
          <Btn size="sm" onClick={() => { setFilterStatus(''); setFilterEmp(''); setFilterMonth(''); }}>Limpar</Btn>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Funcionário</th>
                <th>Empresa</th>
                <th>Motivo</th>
                <th>Status</th>
                <th>Observação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🗓️</div>Nenhum registro encontrado</div></td></tr>
              ) : filtered.map((d) => {
                const emp = employees.find((e) => e.id === d.employee_id);
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{fmtDate(d.date)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{emp?.name[0] ?? '?'}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp?.name ?? '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp?.registration}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp?.company ?? '—'}</td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{d.reason}</span>
                    </td>
                    <td>
                      <span className={`pill ${STATUS_PILL[d.status]}`}>
                        {STATUS_ICONS[d.status]} {d.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{d.observation || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {d.status === 'Pendente' && (
                          <Btn size="sm" onClick={() => markAs(d.id, 'Utilizada')}>✅ Usar</Btn>
                        )}
                        <Btn size="sm" onClick={() => openEdit(d)}>✏️</Btn>
                        <Btn size="sm" variant="danger" onClick={() => remove(d.id)}>🗑️</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '✏️ Editar Folga' : '🗓️ Registrar Folga'}
        footer={<><Btn onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn variant="gold" onClick={save}>{editId ? 'Salvar Alterações' : 'Registrar Folga'}</Btn></>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Funcionário *</div>
            <select className="field-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: Number(e.target.value) }))}>
              {(activeEmps.length > 0 ? activeEmps : employees).map((e) => (
                <option key={e.id} value={e.id}>{e.registration} — {e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data da Folga *</div>
            <input className="field-input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Status</div>
            <select className="field-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DayOffStatus }))}>
              {STATUS_ALL.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Motivo *</div>
            <input
              className="field-input"
              type="text"
              placeholder="Ex: Trabalhou no domingo 08/06"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
            {/* Quick suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {REASON_SUGGESTIONS.map((r) => (
                <button key={r} onClick={() => setForm((f) => ({ ...f, reason: r }))} style={{
                  background: form.reason === r ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${form.reason === r ? 'rgba(212,175,55,0.4)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 10px', fontSize: 11, color: form.reason === r ? 'var(--gold)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, transition: 'all 0.2s',
                }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Observação</div>
            <textarea
              className="field-input"
              style={{ resize: 'vertical', minHeight: 72 }}
              placeholder="Detalhes adicionais..."
              maxLength={300}
              value={form.observation ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
