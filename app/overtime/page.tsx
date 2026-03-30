'use client';
// app/overtime/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { Overtime, OvertimeEmployee } from '@/types';
import { exportOvertimeToPDF, exportOvertimeToExcel } from '@/lib/export';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const TYPE_PILL: Record<string, string> = { Normal: 'pill-green', Sábado: 'pill-yellow', Extra: 'pill-red' };

export default function OvertimePage() {
  const { employees, overtimes, addOvertime, deleteOvertime, addAudit } = useStore();
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7));
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [otDate, setOtDate] = useState(today());
  const [otType, setOtType] = useState<Overtime['type']>('Extra');
  const [defaultStart, setDefaultStart] = useState('16:38');
  const [defaultEndStandard, setDefaultEndStandard] = useState('02:00');
  const [defaultEndExtra, setDefaultEndExtra] = useState('04:00');

  // Step 2
  const [empSearch, setEmpSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  // Step 3
  const [hours, setHours] = useState<Record<number, { start: string; end: string }>>({});

  const activeEmps = useMemo(() => employees.filter((e) => e.status === 'Ativo'), [employees]);

  const filteredEmps = useMemo(() => activeEmps.filter((e) => {
    if (!empSearch) return true;
    return e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.registration.includes(empSearch);
  }), [activeEmps, empSearch]);

  const filteredOTs = useMemo(() => overtimes.filter((o) => {
    if (filterType && o.type !== filterType) return false;
    if (filterMonth && !o.date.startsWith(filterMonth)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [overtimes, filterType, filterMonth]);

  function openModal() {
    setStep(1); setOtDate(today()); setOtType('Extra');
    setDefaultStart('16:38'); setDefaultEndStandard('02:00'); setDefaultEndExtra('04:00');
    setSelected([]); setEmpSearch(''); setHours({});
    setModalOpen(true);
  }

  function toggleEmp(id: number) {
    setSelected((s) => s.includes(id) ? s.filter((i) => i !== id) : [...s, id]);
  }

  function buildHours() {
    setHours((prev) => {
      const next = { ...prev };
      selected.forEach((id) => { if (!next[id]) next[id] = { start: defaultStart, end: defaultEndExtra }; });
      return next;
    });
  }

  function next() {
    if (step === 1) { if (!otDate) { notify('Selecione a data', 'error'); return; } setStep(2); }
    else if (step === 2) { if (!selected.length) { notify('Selecione ao menos 1 funcionário', 'error'); return; } buildHours(); setStep(3); }
    else if (step === 3) { setStep(4); }
    else { save(); }
  }

  async function save() {
    const empList = selected.map((id) => ({
      employee_id: id,
      start_time: hours[id]?.start ?? defaultStart,
      end_time: hours[id]?.end ?? defaultEndExtra,
    }));
    try {
      await addOvertime({ date: otDate, type: otType, created_by: 'Admin' }, empList);
      await addAudit({ user_email: 'Admin', action: 'Criação', detail: `Escala ${otType} criada para ${fmtDate(otDate)} com ${empList.length} funcionário(s)`, type: 'Criação' });
      notify('Escala criada com sucesso!');
      setModalOpen(false);
    } catch (e) {
      notify('Erro ao salvar escala', 'error');
    }
  }

  async function removeOT(id: number) {
    try {
      await deleteOvertime(id);
      await addAudit({ user_email: 'Admin', action: 'Exclusão', detail: 'Escala de hora extra removida', type: 'Exclusão' });
      notify('Escala excluída');
    } catch (e) {
      notify('Erro ao excluir escala', 'error');
    }
  }

  const stepLabels = ['Dados gerais', 'Funcionários', 'Horários', 'Confirmar'];

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>Hora Extra</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Gestão e execução de escalas</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => exportOvertimeToExcel(filteredOTs, employees)}>📊 Excel</Btn>
          <Btn onClick={() => exportOvertimeToPDF(filteredOTs, employees)}>📄 PDF</Btn>
          <Btn variant="gold" onClick={openModal}>+ Nova Escala</Btn>
        </div>
      </div>

      <div className="card-premium" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Escalas cadastradas</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="field-input" style={{ width: 145 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option>Normal</option><option>Sábado</option><option>Extra</option>
            </select>
            <input className="field-input" type="month" style={{ width: 155 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
          </div>
        </div>

        {filteredOTs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>⏱️</div>
            Nenhuma escala encontrada
          </div>
        ) : filteredOTs.map((ot) => (
          <div key={ot.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-card)', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>⏱️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtDate(ot.date)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Criado por {ot.created_by}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`pill ${TYPE_PILL[ot.type] ?? 'pill-gray'}`}>{ot.type}</span>
                <span className="pill pill-blue">{ot.employees.length} colaboradores</span>
                <Btn size="sm" variant="danger" onClick={() => removeOT(ot.id)}>🗑️</Btn>
              </div>
            </div>
            <div className="table-wrapper" style={{ padding: '0 18px 14px' }}>
              <table>
                <thead><tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Cargo</th><th>Entrada</th><th>Saída</th></tr></thead>
                <tbody>
                  {ot.employees.map((e, i) => {
                    const emp = employees.find((em) => em.id === e.employee_id);
                    return emp ? (
                      <tr key={i}>
                        <td><code style={{ fontSize: 12, color: 'var(--gold)' }}>{emp.registration}</code></td>
                        <td>{emp.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{emp.company}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                        <td><span className="pill pill-green">{e.start}</span></td>
                        <td><span className="pill pill-blue">{e.end}</span></td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal wizard */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Escala de Hora Extra" maxWidth={700}
        footer={
          <>
            {step > 1 && <Btn onClick={() => setStep(step - 1)}>← Anterior</Btn>}
            <Btn onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn variant="gold" onClick={next}>{step === 4 ? '✓ Salvar Escala' : 'Próximo →'}</Btn>
          </>
        }>
        {/* Steps nav */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 10, padding: 4, marginBottom: 24, overflowX: 'auto' }}>
          {stepLabels.map((label, i) => {
            const n = i + 1;
            return (
              <button key={n} onClick={() => n < step && setStep(n)} style={{
                flex: 1, minWidth: 90, padding: '8px 12px', borderRadius: 8,
                background: step === n ? 'var(--gold)' : 'transparent',
                border: 'none', fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 600,
                color: step === n ? 'var(--bg-base)' : n < step ? 'var(--success)' : 'var(--text-muted)',
                cursor: n < step ? 'pointer' : 'default', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{n < step ? '✓' : n}</span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Data da escala *</div>
              <input className="field-input" type="date" value={otDate} onChange={(e) => setOtDate(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Tipo de escala *</div>
              <select className="field-input" value={otType} onChange={(e) => setOtType(e.target.value as Overtime['type'])}>
                <option>Extra</option><option>Sábado</option><option>Normal</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Entrada padrão</div>
              <input className="field-input" type="time" value={defaultStart} onChange={(e) => setDefaultStart(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Saída padrão</div>
              <input className="field-input" type="time" value={defaultEndStandard} onChange={(e) => setDefaultEndStandard(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Horário de Extra (Saída Final)</div>
              <input className="field-input" type="time" value={defaultEndExtra} onChange={(e) => setDefaultEndExtra(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Buscar funcionário</div>
              <input className="field-input" placeholder="Digite nome ou matrícula..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
            </div>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card)' }}>
              {filteredEmps.map((e) => {
                const sel = selected.includes(e.id);
                return (
                  <div key={e.id} onClick={() => toggleEmp(e.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                    background: sel ? 'rgba(250,204,21,0.1)' : 'transparent', transition: 'background 0.15s',
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: sel ? 'none' : '2px solid var(--border)', background: sel ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--bg-base)', fontWeight: 700, flexShrink: 0 }}>{sel ? '✓' : ''}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.registration} · {e.company} · {e.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              Selecionados: <strong style={{ color: 'var(--gold)' }}>{selected.length}</strong> funcionário(s)
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Ajuste os horários individualmente se necessário:</div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Matrícula</th><th>Nome</th><th>Entrada</th><th>Saída</th></tr></thead>
                <tbody>
                  {selected.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    if (!emp) return null;
                    return (
                      <tr key={id}>
                        <td><code style={{ fontSize: 12, color: 'var(--gold)' }}>{emp.registration}</code></td>
                        <td>{emp.name}</td>
                        <td><input type="time" value={hours[id]?.start ?? defaultStart}
                          onChange={(e) => setHours((h) => ({ ...h, [id]: { ...h[id], start: e.target.value } }))}
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif', fontSize: 13, width: 100, outline: 'none' }} /></td>
                        <td><input type="time" value={hours[id]?.end ?? defaultEndExtra}
                          onChange={(e) => setHours((h) => ({ ...h, [id]: { ...h[id], end: e.target.value } }))}
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif', fontSize: 13, width: 100, outline: 'none' }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <>
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[['Data', fmtDate(otDate)], ['Tipo', otType], ['Funcionários', String(selected.length)]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Funcionários na escala:</div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Cargo</th><th>Entrada</th><th>Saída</th></tr></thead>
                <tbody>
                  {selected.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    const h = hours[id];
                    return emp ? (
                      <tr key={id}>
                        <td><code style={{ fontSize: 12, color: 'var(--gold)' }}>{emp.registration}</code></td>
                        <td>{emp.name}</td>
                        <td>{emp.company}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                        <td><span className="pill pill-green">{h?.start ?? defaultStart}</span></td>
                        <td><span className="pill pill-blue">{h?.end ?? defaultEndExtra}</span></td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  );
}
