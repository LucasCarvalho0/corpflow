'use client';
// app/vacations/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import StatCard from '@/components/StatCard';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { Vacation, VacationStatus } from '@/types';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function diffDays(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
function durationDays(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

const STATUS_PILL: Record<VacationStatus, string> = {
  'Agendado': 'pill-yellow',
  'Em férias': 'pill-green',
  'Concluído': 'pill-blue',
  'Cancelado': 'pill-gray',
};

const STATUS_ICONS: Record<VacationStatus, string> = {
  'Agendado': '📅',
  'Em férias': '🏖️',
  'Concluído': '✅',
  'Cancelado': '❌',
};

const STATUS_ALL: VacationStatus[] = ['Agendado', 'Em férias', 'Concluído', 'Cancelado'];

export default function VacationsPage() {
  const { employees, vacations, addVacation, updateVacation, deleteVacation, addAudit } = useStore();
  const activeEmps = useMemo(() => employees.filter((e) => e.status === 'Ativo'), [employees]);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Vacation, 'id' | 'created_at'>>({
    employee_id: activeEmps[0]?.id ?? 0,
    start_date: today(),
    end_date: today(),
    status: 'Agendado',
    observation: '',
  });

  const filtered = useMemo(() => vacations.filter((v) => {
    if (filterStatus && v.status !== filterStatus) return false;
    if (filterEmp && String(v.employee_id) !== filterEmp) return false;
    if (filterMonth && !v.start_date.startsWith(filterMonth)) return false;
    return true;
  }).sort((a, b) => a.start_date.localeCompare(b.start_date)), [vacations, filterStatus, filterEmp, filterMonth]);

  const stats = useMemo(() => ({
    agendadas: vacations.filter((v) => v.status === 'Agendado').length,
    emFerias: vacations.filter((v) => v.status === 'Em férias').length,
    concluidas: vacations.filter((v) => v.status === 'Concluído').length,
    total: vacations.length,
  }), [vacations]);

  function openNew() {
    setEditId(null);
    setForm({ employee_id: activeEmps[0]?.id ?? 0, start_date: today(), end_date: today(), status: 'Agendado', observation: '' });
    setModalOpen(true);
  }

  function openEdit(v: Vacation) {
    setEditId(v.id);
    setForm({ employee_id: v.employee_id, start_date: v.start_date, end_date: v.end_date, status: v.status, observation: v.observation ?? '' });
    setModalOpen(true);
  }

  async function save() {
    if (!form.start_date || !form.end_date || !form.employee_id) {
      notify('Preencha todos os campos obrigatórios', 'error'); return;
    }
    if (form.end_date < form.start_date) {
      notify('Data de fim deve ser após o início', 'error'); return;
    }
    const emp = employees.find((e) => e.id === form.employee_id);
    try {
      if (editId) {
        await updateVacation(editId, form);
        await addAudit({ user_email: 'Admin', action: 'Edição', detail: `Férias de ${emp?.name} atualizadas`, type: 'Edição' });
        notify('Férias atualizadas!');
      } else {
        await addVacation(form);
        await addAudit({ user_email: 'Admin', action: 'Criação', detail: `Férias registradas para ${emp?.name}`, type: 'Criação' });
        notify('Férias registradas com sucesso!');
      }
      setModalOpen(false);
    } catch (e: any) {
      notify(e.message || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id: number) {
    try {
      await deleteVacation(id);
      await addAudit({ user_email: 'Admin', action: 'Exclusão', detail: 'Registro de férias removido', type: 'Exclusão' });
      notify('Registro excluído');
    } catch (e: any) {
      notify(e.message || 'Erro ao excluir', 'error');
    }
  }

  // Alertas: férias nos próximos 30 dias
  const upcoming = useMemo(() => vacations.filter((v) => {
    if (v.status === 'Cancelado' || v.status === 'Concluído') return false;
    const days = diffDays(v.start_date);
    return days >= 0 && days <= 30;
  }).sort((a, b) => a.start_date.localeCompare(b.start_date)), [vacations]);

  const monthOptions = useMemo(() => {
    const months = new Set(vacations.map((v) => v.start_date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [vacations]);

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>🏖️ Férias</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Gestão de períodos de férias dos colaboradores</div>
        </div>
        <Btn variant="gold" onClick={openNew}>+ Registrar Férias</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="📅" value={stats.agendadas} label="Agendadas" accent="gold" />
        <StatCard icon="🏖️" value={stats.emFerias} label="Em Férias" accent="green" />
        <StatCard icon="✅" value={stats.concluidas} label="Concluídas" accent="blue" />
        <StatCard icon="📊" value={stats.total} label="Total de registros" accent="red" />
      </div>

      {/* Alert box — upcoming */}
      {upcoming.length > 0 && (
        <div style={{
          background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold)', fontFamily: 'Outfit, sans-serif' }}>
              Férias nos próximos 30 dias
            </span>
            <span style={{ background: 'var(--gold)', color: '#000', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
              {upcoming.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {upcoming.map((v) => {
              const emp = employees.find((e) => e.id === v.employee_id);
              const days = diffDays(v.start_date);
              return (
                <div key={v.id} style={{
                  background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 12, padding: '12px 16px', minWidth: 200,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{emp?.name ?? '—'}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {fmtDate(v.start_date)} → {fmtDate(v.end_date)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: days === 0 ? '#f87171' : days <= 7 ? '#fb923c' : 'var(--gold)',
                      background: days === 0 ? 'rgba(239,68,68,0.1)' : days <= 7 ? 'rgba(251,146,60,0.1)' : 'rgba(212,175,55,0.1)',
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      {days === 0 ? 'Começa hoje!' : `Em ${days} dia${days !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
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
          <select className="field-input" style={{ width: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
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
                <th>Funcionário</th>
                <th>Empresa</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Dias</th>
                <th>Status</th>
                <th>Observação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🏖️</div>Nenhum registro encontrado</div></td></tr>
              ) : filtered.map((v) => {
                const emp = employees.find((e) => e.id === v.employee_id);
                const dur = durationDays(v.start_date, v.end_date);
                const daysLeft = diffDays(v.start_date);
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{emp?.name[0] ?? '?'}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp?.name ?? '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp?.registration}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp?.company ?? '—'}</td>
                    <td style={{ fontWeight: 600 }}>
                      {fmtDate(v.start_date)}
                      {v.status === 'Agendado' && daysLeft >= 0 && daysLeft <= 30 && (
                        <div style={{ fontSize: 10, color: daysLeft <= 7 ? '#fb923c' : 'var(--gold)', fontWeight: 700, marginTop: 2 }}>
                          {daysLeft === 0 ? 'Hoje!' : `em ${daysLeft}d`}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmtDate(v.end_date)}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--gold)' }}>{dur}d</span></td>
                    <td>
                      <span className={`pill ${STATUS_PILL[v.status]}`}>
                        {STATUS_ICONS[v.status]} {v.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 180 }}>{v.observation || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size="sm" onClick={() => openEdit(v)}>✏️ Editar</Btn>
                        <Btn size="sm" variant="danger" onClick={() => remove(v.id)}>🗑️</Btn>
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
        title={editId ? '✏️ Editar Férias' : '🏖️ Registrar Férias'}
        footer={<><Btn onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn variant="gold" onClick={save}>{editId ? 'Salvar Alterações' : 'Registrar Férias'}</Btn></>}
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
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data de Início *</div>
            <input className="field-input" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data de Fim *</div>
            <input className="field-input" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          {form.start_date && form.end_date && form.end_date >= form.start_date && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>
              📅 Duração: {durationDays(form.start_date, form.end_date)} dias corridos
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Status</div>
            <select className="field-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VacationStatus }))}>
              {STATUS_ALL.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Observação</div>
            <textarea
              className="field-input"
              style={{ resize: 'vertical', minHeight: 80 }}
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
