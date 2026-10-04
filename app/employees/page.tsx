'use client';
// app/employees/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { Employee } from '@/types';
import { exportEmployeesToPDF, exportEmployeesToExcel } from '@/lib/export';

const TERMINATION_REASONS = [
  'Demissão sem justa causa',
  'Pedido de demissão',
  'Demissão por justa causa',
  'Fim de contrato',
  'Aposentadoria',
  'Outro',
];

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const COMPANIES = ['Sesé', 'Ourho'];
const SCHEDULES = ['16:38 às 02:00'];
const SHIFTS = ['Turno Noite'];

const blank = (): Omit<Employee, 'id'> => ({
  registration: '', name: '', company: 'Sesé', role: '', work_schedule: '16:38 às 02:00', shift: 'Turno Noite', status: 'Ativo',
});

export default function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, addAudit } = useStore();
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(blank());

  // Deactivation modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateEmp, setDeactivateEmp] = useState<Employee | null>(null);
  const [terminationDate, setTerminationDate] = useState(today());
  const [terminationReason, setTerminationReason] = useState(TERMINATION_REASONS[0]);
  const [terminationObs, setTerminationObs] = useState('');

  const filtered = useMemo(() => employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.registration.includes(search)) return false;
    if (filterCompany && e.company !== filterCompany) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  }), [employees, search, filterCompany, filterStatus]);

  function openCreate() { setEditId(null); setForm(blank()); setModalOpen(true); }
  function openEdit(e: Employee) { setEditId(e.id); setForm({ registration: e.registration, name: e.name, company: e.company, role: e.role, work_schedule: e.work_schedule, shift: e.shift, status: e.status }); setModalOpen(true); }

  async function save() {
    if (!form.registration.trim() || !form.name.trim() || !form.role.trim()) { notify('Preencha os campos obrigatórios', 'error'); return; }
    try {
      if (editId) {
        await updateEmployee(editId, form);
        await addAudit({ user_email: 'Admin', action: 'Edição', detail: `Funcionário ${form.name} atualizado`, type: 'Edição' });
        notify('Funcionário atualizado com sucesso!');
      } else {
        await addEmployee(form);
        await addAudit({ user_email: 'Admin', action: 'Criação', detail: `Funcionário ${form.name} cadastrado`, type: 'Criação' });
        notify('Funcionário cadastrado com sucesso!');
      }
      setModalOpen(false);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('unique_registration') || msg.includes('duplicate key')) {
        notify('Erro: Matrícula já cadastrada', 'error');
      } else if (msg.includes('JWT') || msg.includes('claims') || msg.includes('auth')) {
        notify('Erro: Sessão expirada ou sem permissão. Refaça o login.', 'error');
      } else {
        notify('Erro ao salvar funcionário', 'error');
      }
      console.error('Save error:', e);
    }
  }

  // Opens deactivation modal when going Ativo → Inativo; reactivates directly otherwise
  function handleToggleStatus(emp: Employee) {
    if (emp.status === 'Ativo') {
      setDeactivateEmp(emp);
      setTerminationDate(today());
      setTerminationReason(TERMINATION_REASONS[0]);
      setTerminationObs('');
      setDeactivateModalOpen(true);
    } else {
      reactivate(emp);
    }
  }

  async function reactivate(emp: Employee) {
    try {
      await updateEmployee(emp.id, { status: 'Ativo' });
      await addAudit({ user_email: 'Admin', action: 'Edição', detail: `Funcionário ${emp.name} reativado no sistema`, type: 'Edição' });
      notify(`${emp.name} foi reativado com sucesso`);
    } catch (e) {
      notify('Erro ao reativar funcionário', 'error');
    }
  }

  async function confirmDeactivation() {
    if (!deactivateEmp) return;
    if (!terminationDate) { notify('Informe a data de saída', 'error'); return; }
    try {
      const terminationMeta = {
        termination_date: terminationDate,
        termination_reason: terminationReason,
        termination_obs: terminationObs || undefined,
        terminated_at: new Date().toISOString(),
      };
      await updateEmployee(deactivateEmp.id, { status: 'Inativo', metadata: terminationMeta });
      await addAudit({
        user_email: 'Admin',
        action: 'Edição',
        detail: `Funcionário ${deactivateEmp.name} (Matrícula: ${deactivateEmp.registration}) desligado em ${fmtDate(terminationDate)}. Empresa: ${deactivateEmp.company}. Cargo: ${deactivateEmp.role}. Turno: ${deactivateEmp.shift}. Horário: ${deactivateEmp.work_schedule}. Motivo: ${terminationReason}${terminationObs ? `. Obs: ${terminationObs}` : ''}`,
        type: 'Edição',
      });
      notify(`${deactivateEmp.name} foi marcado como inativo`);
      setDeactivateModalOpen(false);
      setDeactivateEmp(null);
    } catch (e) {
      notify('Erro ao desativar funcionário', 'error');
    }
  }

  async function remove(emp: Employee) {
    if (!confirm(`Tem certeza que deseja excluir o funcionário ${emp.name}?\nEsta ação não poderá ser desfeita.`)) return;
    try {
      await deleteEmployee(emp.id);
      await addAudit({ user_email: 'Admin', action: 'Exclusão', detail: `Funcionário ${emp.name} excluído do sistema`, type: 'Exclusão' });
      notify('Funcionário excluído com sucesso');
    } catch (e) {
      notify('Erro ao excluir funcionário', 'error');
    }
  }

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>Funcionário</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Gestão e cadastro de colaboradores</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => exportEmployeesToExcel(filtered)}>📊 Excel</Btn>
          <Btn onClick={() => exportEmployeesToPDF(filtered)}>📄 PDF</Btn>
          <Btn variant="gold" onClick={openCreate}>+ Novo Funcionário</Btn>
        </div>
      </div>

      <div className="card-premium" style={{ padding: 28, background: 'var(--bg-card)' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input className="field-input" style={{ paddingLeft: 36 }} type="text" placeholder="Buscar por nome ou matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field-input" style={{ width: 160 }} value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
            <option value="">Todas as empresas</option>
            {COMPANIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="field-input" style={{ width: 130 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option>Ativo</option><option>Inativo</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead><tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Cargo</th><th>Horário</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>👤</div>Nenhum funcionário encontrado</div></td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td><code style={{ fontSize: 12, color: 'var(--gold)' }}>{e.registration}</code></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(250,204,21,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{e.name[0]}</div>
                    {e.name}
                  </div></td>
                  <td>{e.company}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.role}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.work_schedule}</td>
                  <td><span className={`pill ${e.status === 'Ativo' ? 'pill-green' : 'pill-gray'}`}>{e.status}</span></td>
                  <td><div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" onClick={() => openEdit(e)} title="Editar">✏️</Btn>
                    <Btn size="sm" variant={e.status === 'Ativo' ? 'danger' : 'gold'} onClick={() => handleToggleStatus(e)} title={e.status === 'Ativo' ? 'Desativar funcionário' : 'Reativar funcionário'}>
                      {e.status === 'Ativo' ? '🚫' : '✅'}
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => remove(e)} title="Excluir">🗑️</Btn>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cadastro / Edição Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Funcionário' : 'Novo Funcionário'}
        footer={<><Btn onClick={() => setModalOpen(false)}>Cancelar</Btn><Btn variant="gold" onClick={save}>Salvar Funcionário</Btn></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Matrícula *</div>
            <input className="field-input" placeholder="001234" value={form.registration} onChange={F('registration')} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Status</div>
            <select className="field-input" value={form.status} onChange={F('status')}><option>Ativo</option><option>Inativo</option></select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Nome completo *</div>
            <input className="field-input" placeholder="Nome do colaborador" value={form.name} onChange={F('name')} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Empresa *</div>
            <select className="field-input" value={form.company} onChange={F('company')}>{COMPANIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Cargo *</div>
            <input className="field-input" placeholder="Ex: Operador, Técnico..." value={form.role} onChange={F('role')} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Horário</div>
            <select className="field-input" value={form.work_schedule} onChange={F('work_schedule')}>{SCHEDULES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Turno</div>
            <select className="field-input" value={form.shift} onChange={F('shift')}>{SHIFTS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        </div>
      </Modal>

      {/* ── Modal de Desligamento ── */}
      <Modal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Registrar Desligamento"
        maxWidth={560}
        footer={
          <>
            <Btn onClick={() => setDeactivateModalOpen(false)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmDeactivation}>🚫 Confirmar Desligamento</Btn>
          </>
        }
      >
        {deactivateEmp && (
          <div>
            {/* Employee summary card */}
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                ⚠️ Funcionário a ser desligado
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                {([
                  ['Nome', deactivateEmp.name],
                  ['Matrícula', deactivateEmp.registration],
                  ['Empresa', deactivateEmp.company],
                  ['Cargo', deactivateEmp.role],
                  ['Horário', deactivateEmp.work_schedule],
                  ['Turno', deactivateEmp.shift],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Termination fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data de Saída *</div>
                <input
                  className="field-input"
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Motivo do Desligamento *</div>
                <select
                  className="field-input"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                >
                  {TERMINATION_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Observação (opcional)</div>
                <input
                  className="field-input"
                  placeholder="Informações adicionais sobre o desligamento..."
                  value={terminationObs}
                  onChange={(e) => setTerminationObs(e.target.value)}
                />
              </div>
            </div>

            <div style={{
              marginTop: 18, padding: '10px 14px', background: 'rgba(250,204,21,0.06)',
              border: '1px solid rgba(250,204,21,0.15)', borderRadius: 8,
              fontSize: 12, color: 'var(--text-secondary)',
            }}>
              💡 O funcionário ficará salvo no sistema como <strong style={{ color: 'var(--gold)' }}>Inativo</strong>. O registro completo de desligamento será salvo no log de auditoria.
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
