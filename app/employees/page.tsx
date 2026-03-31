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

  async function toggleStatus(emp: Employee) {
    const next = emp.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      await updateEmployee(emp.id, { status: next });
      await addAudit({ user_email: 'Admin', action: 'Edição', detail: `Status de ${emp.name} alterado para ${next}`, type: 'Edição' });
      notify(`Status alterado para ${next}`);
    } catch (e) {
      notify('Erro ao alterar status', 'error');
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

      <div className="card-premium" style={{ padding: 28, background: 'linear-gradient(180deg, #111 0%, #080808 100%)' }}>
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
                    <Btn size="sm" variant={e.status === 'Ativo' ? 'danger' : 'gold'} onClick={() => toggleStatus(e)} title={e.status === 'Ativo' ? 'Desativar' : 'Ativar'}>
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

      {/* Modal */}
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
    </AppShell>
  );
}
