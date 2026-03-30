'use client';
// app/absences/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import StatCard from '@/components/StatCard';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { Absence } from '@/types';
import { exportAbsencesToPDF, exportAbsencesToExcel } from '@/lib/export';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const TYPE_PILL: Record<string, string> = { Falta: 'pill-red', Atestado: 'pill-blue', Justificada: 'pill-yellow' };

export default function AbsencesPage() {
  const { employees, absences, addAbsence, deleteAbsence, addAudit } = useStore();
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<Absence, 'id'>>({ date: today(), employee_id: employees[0]?.id ?? 0, type: 'Falta', observation: '' });

  const activeEmps = useMemo(() => employees.filter((e) => e.status === 'Ativo'), [employees]);

  const filtered = useMemo(() => absences.filter((a) => {
    if (filterStart && a.date < filterStart) return false;
    if (filterEnd && a.date > filterEnd) return false;
    if (filterType && a.type !== filterType) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [absences, filterStart, filterEnd, filterType]);

  const stats = useMemo(() => ({
    total: absences.length,
    faltas: absences.filter((a) => a.type === 'Falta').length,
    atestados: absences.filter((a) => a.type === 'Atestado').length,
    justificadas: absences.filter((a) => a.type === 'Justificada').length,
  }), [absences]);

  function openModal() {
    setForm({ date: today(), employee_id: activeEmps[0]?.id ?? 0, type: 'Falta', observation: '' });
    setModalOpen(true);
  }

  async function save() {
    if (!form.date || !form.employee_id) { notify('Preencha os campos obrigatórios', 'error'); return; }
    const emp = employees.find((e) => e.id === form.employee_id);
    try {
      await addAbsence(form);
      await addAudit({ user_email: 'Admin', action: 'Criação', detail: `Ausência registrada para ${emp?.name ?? 'funcionário'} (${form.type})`, type: 'Criação' });
      notify('Ausência registrada com sucesso!');
      setModalOpen(false);
    } catch (e) {
      notify('Erro ao salvar ausência', 'error');
    }
  }

  async function remove(id: number) {
    try {
      await deleteAbsence(id);
      await addAudit({ user_email: 'Admin', action: 'Exclusão', detail: 'Registro de ausência removido', type: 'Exclusão' });
      notify('Registro excluído');
    } catch (e) {
      notify('Erro ao excluir registro', 'error');
    }
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>Absenteísmo</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Controle de faltas e atestados</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => exportAbsencesToExcel(filtered, employees)}>📊 Excel</Btn>
          <Btn onClick={() => exportAbsencesToPDF(filtered, employees)}>📄 PDF</Btn>
          <Btn variant="gold" onClick={openModal}>+ Registrar Ausência</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="📊" value={stats.total} label="Total de ausências" accent="red" />
        <StatCard icon="❌" value={stats.faltas} label="Faltas" accent="red" />
        <StatCard icon="📋" value={stats.atestados} label="Atestados" accent="blue" />
        <StatCard icon="✅" value={stats.justificadas} label="Justificadas" accent="gold" />
      </div>

      <div className="card-premium" style={{ padding: 28 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="field-input" type="date" style={{ width: 155 }} value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          <input className="field-input" type="date" style={{ width: 155 }} value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
          <select className="field-input" style={{ width: 145 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option>Falta</option><option>Atestado</option><option>Justificada</option>
          </select>
          <Btn size="sm" onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterType(''); }}>Limpar</Btn>
        </div>

        <div className="table-wrapper">
          <table>
            <thead><tr><th>Data</th><th>Funcionário</th><th>Empresa</th><th>Tipo</th><th>Observação</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📋</div>Nenhum registro encontrado</div></td></tr>
              ) : filtered.map((a) => {
                const emp = employees.find((e) => e.id === a.employee_id);
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{fmtDate(a.date)}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{emp?.name[0] ?? '?'}</div>
                      {emp?.name ?? '—'}
                    </div></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp?.company ?? '—'}</td>
                    <td><span className={`pill ${TYPE_PILL[a.type] ?? 'pill-gray'}`}>{a.type}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{a.observation || '—'}</td>
                    <td><Btn size="sm" variant="danger" onClick={() => remove(a.id)}>🗑️ Excluir</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Ausência"
        footer={<><Btn onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn variant="gold" onClick={save}>Salvar Registro</Btn></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data *</div>
            <input className="field-input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Tipo *</div>
            <select className="field-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Absence['type'] }))}>
              <option>Falta</option><option>Atestado</option><option>Justificada</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Funcionário *</div>
            <select className="field-input" value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: Number(e.target.value) }))}>
              {activeEmps.map((e) => <option key={e.id} value={e.id}>{e.registration} — {e.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Observação</div>
              <div style={{ fontSize: 10, color: form.observation.length >= 350 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                {form.observation.length} / 350
              </div>
            </div>
            <textarea 
              className="field-input" 
              style={{ resize: 'vertical', minHeight: 80, borderColor: form.observation.length >= 350 ? 'rgba(239,68,68,0.3)' : '' }} 
              placeholder="Detalhes adicionais..." 
              maxLength={350}
              value={form.observation} 
              onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))} 
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
