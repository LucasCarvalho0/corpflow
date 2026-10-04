'use client';
// app/inactive-employees/page.tsx
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import Btn from '@/components/Btn';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import type { Employee, TerminationInfo } from '@/types';

function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtDateTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getTermination(emp: Employee): TerminationInfo | null {
  const m = emp.metadata;
  if (!m || typeof m !== 'object') return null;
  const tm = m as Record<string, any>;
  if (!tm.termination_date && !tm.termination_reason) return null;
  return {
    termination_date: tm.termination_date || '',
    termination_reason: tm.termination_reason || 'Não informado',
    termination_obs: tm.termination_obs || '',
    terminated_at: tm.terminated_at || '',
  };
}

const REASON_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Demissão sem justa causa': { bg: 'rgba(239,68,68,0.08)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
  'Pedido de demissão':        { bg: 'rgba(250,204,21,0.08)', color: '#fbbf24', border: 'rgba(250,204,21,0.2)' },
  'Demissão por justa causa':  { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  'Fim de contrato':           { bg: 'rgba(99,102,241,0.08)', color: '#818cf8', border: 'rgba(99,102,241,0.2)' },
  'Aposentadoria':             { bg: 'rgba(16,185,129,0.08)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
  'Outro':                     { bg: 'rgba(156,163,175,0.08)', color: '#9ca3af', border: 'rgba(156,163,175,0.2)' },
};

function ReasonBadge({ reason }: { reason: string }) {
  const style = REASON_COLORS[reason] ?? REASON_COLORS['Outro'];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    }}>
      {reason}
    </span>
  );
}

export default function InactiveEmployeesPage() {
  const { employees, updateEmployee, addAudit } = useStore();
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [reactivating, setReactivating] = useState(false);

  const inactiveEmps = useMemo(() =>
    employees.filter((e) => e.status === 'Inativo'),
    [employees]
  );

  const filtered = useMemo(() => inactiveEmps.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.registration.includes(search)) return false;
    if (filterCompany && e.company !== filterCompany) return false;
    if (filterReason) {
      const t = getTermination(e);
      if (!t || t.termination_reason !== filterReason) return false;
    }
    return true;
  }), [inactiveEmps, search, filterCompany, filterReason]);

  const companies = useMemo(() => [...new Set(inactiveEmps.map((e) => e.company))], [inactiveEmps]);

  async function reactivate(emp: Employee) {
    setReactivating(true);
    try {
      await updateEmployee(emp.id, { status: 'Ativo', metadata: null });
      await addAudit({
        user_email: 'Admin',
        action: 'Edição',
        detail: `Funcionário ${emp.name} (Matrícula: ${emp.registration}) reativado no sistema`,
        type: 'Edição',
      });
      notify(`${emp.name} foi reativado com sucesso`);
      setDetailEmp(null);
    } catch (e) {
      notify('Erro ao reativar funcionário', 'error');
    } finally {
      setReactivating(false);
    }
  }

  const detailTermination = detailEmp ? getTermination(detailEmp) : null;

  // Stats
  const statsByReason = useMemo(() => {
    const counts: Record<string, number> = {};
    inactiveEmps.forEach((e) => {
      const t = getTermination(e);
      const key = t?.termination_reason ?? 'Não registrado';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [inactiveEmps]);

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🚫</div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, fontFamily: 'Outfit, sans-serif' }}>Funcionários Inativos</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2, fontWeight: 500 }}>
                Histórico de desligamentos e colaboradores desligados
              </div>
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{inactiveEmps.length}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>funcionários inativos</span>
        </div>
      </div>

      {/* Summary cards por motivo */}
      {Object.keys(statsByReason).length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {Object.entries(statsByReason).map(([reason, count]) => {
            const style = REASON_COLORS[reason] ?? REASON_COLORS['Outro'];
            return (
              <div
                key={reason}
                onClick={() => setFilterReason(filterReason === reason ? '' : reason)}
                style={{
                  padding: '12px 18px', borderRadius: 12, cursor: 'pointer',
                  background: filterReason === reason ? style.bg : 'var(--bg-card)',
                  border: `1px solid ${filterReason === reason ? style.border : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 800, color: style.color }}>{count}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 120 }}>{reason}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main card */}
      <div className="card-premium" style={{ padding: 28 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input
              className="field-input"
              style={{ paddingLeft: 36 }}
              type="text"
              placeholder="Buscar por nome ou matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {companies.length > 1 && (
            <select className="field-input" style={{ width: 160 }} value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
              <option value="">Todas as empresas</option>
              {companies.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          <select className="field-input" style={{ width: 200 }} value={filterReason} onChange={(e) => setFilterReason(e.target.value)}>
            <option value="">Todos os motivos</option>
            <option>Demissão sem justa causa</option>
            <option>Pedido de demissão</option>
            <option>Demissão por justa causa</option>
            <option>Fim de contrato</option>
            <option>Aposentadoria</option>
            <option>Outro</option>
            <option>Não registrado</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🚫</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {inactiveEmps.length === 0 ? 'Nenhum funcionário inativo' : 'Nenhum resultado encontrado'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {inactiveEmps.length === 0
                ? 'Quando um funcionário for desativado, aparecerá aqui.'
                : 'Tente ajustar os filtros acima.'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>Empresa</th>
                  <th>Cargo</th>
                  <th>Data de Saída</th>
                  <th>Motivo</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const t = getTermination(emp);
                  return (
                    <tr key={emp.id} style={{ opacity: 0.9 }}>
                      <td><code style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.registration}</code></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(156,163,175,0.15)', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 12, flexShrink: 0,
                          }}>{emp.name[0]}</div>
                          <span style={{ color: 'var(--text-secondary)' }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.company}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{emp.role}</td>
                      <td>
                        {t?.termination_date
                          ? <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(t.termination_date)}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {t?.termination_reason
                          ? <ReasonBadge reason={t.termination_reason} />
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Não registrado</span>}
                      </td>
                      <td>
                        <Btn size="sm" onClick={() => setDetailEmp(emp)} title="Ver detalhes do desligamento">
                          📋 Ver
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detailEmp}
        onClose={() => setDetailEmp(null)}
        title="Ficha de Desligamento"
        maxWidth={560}
        footer={
          <>
            <Btn onClick={() => setDetailEmp(null)}>Fechar</Btn>
            <Btn variant="gold" onClick={() => detailEmp && reactivate(detailEmp)} disabled={reactivating}>
              ✅ {reactivating ? 'Reativando...' : 'Reativar Funcionário'}
            </Btn>
          </>
        }
      >
        {detailEmp && (
          <div>
            {/* Perfil */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)', borderRadius: 12, marginBottom: 20,
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'rgba(156,163,175,0.15)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 20, flexShrink: 0,
              }}>{detailEmp.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{detailEmp.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {detailEmp.role} · {detailEmp.company}
                </div>
              </div>
              <span className="pill pill-gray">Inativo</span>
            </div>

            {/* Dados do funcionário */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                📋 Dados do colaborador
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {([
                  ['Matrícula', detailEmp.registration],
                  ['Empresa', detailEmp.company],
                  ['Cargo', detailEmp.role],
                  ['Horário', detailEmp.work_schedule],
                  ['Turno', detailEmp.shift],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dados do desligamento */}
            {detailTermination ? (
              <div style={{
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 12, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  🚫 Registro de Desligamento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Data de Saída</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 3 }}>
                      {fmtDate(detailTermination.termination_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Motivo</div>
                    <ReasonBadge reason={detailTermination.termination_reason} />
                  </div>
                  {detailTermination.termination_obs && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Observação</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        "{detailTermination.termination_obs}"
                      </div>
                    </div>
                  )}
                  {detailTermination.terminated_at && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Registrado em</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        {fmtDateTime(detailTermination.terminated_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(156,163,175,0.06)', border: '1px solid rgba(156,163,175,0.15)',
                borderRadius: 12, padding: '16px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📄</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Nenhum registro de desligamento encontrado.<br />
                  Este funcionário pode ter sido inativado manualmente.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
