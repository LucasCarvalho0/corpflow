'use client';
// app/dashboard/page.tsx
import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import { useStore } from '@/lib/store';
import type { Employee } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function today() { return new Date().toISOString().slice(0, 10); }
function thisMonth() { return new Date().toISOString().slice(0, 7); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function diffDays(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Calcula horas entre dois horários HH:MM — suporta virada de meia-noite */
function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${String(mins).padStart(2, '0')}m`;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const TYPE_COLOR: Record<string, string> = {
  Extra: '#facc15', Sábado: '#a78bfa', Sabado: '#a78bfa',
  Normal: '#34d399', Domingo: '#fb923c', Feriado: '#f87171',
};

export default function DashboardPage() {
  const { employees, absences, overtimes, vacations, dayOffs, loading } = useStore();

  const [rankingMonth, setRankingMonth] = useState(thisMonth());
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);

  const stats = useMemo(() => {
    if (loading) return { active: 0, total: 0, absToday: 0, atestados: 0, otToday: 0, otMonth: 0 };
    const t = today();
    const active = employees.filter((e) => e.status === 'Ativo').length;
    const absToday = absences.filter((a) => a.date === t).length;
    const atestados = absences.filter((a) => a.type === 'Atestado').length;
    const otToday = overtimes.filter((o) => o.date === t).reduce((s, o) => s + o.employees.length, 0);
    const otMonth = overtimes.reduce((s, o) => s + o.employees.length, 0);
    return { active, total: employees.length, absToday, atestados, otToday, otMonth };
  }, [employees, absences, overtimes, loading]);

  const upcomingVacations = useMemo(() => vacations.filter((v) => {
    if (v.status === 'Cancelado' || v.status === 'Concluído') return false;
    const days = diffDays(v.start_date);
    return days >= 0 && days <= 30;
  }).sort((a, b) => a.start_date.localeCompare(b.start_date)), [vacations]);

  const pendingDayOffs = useMemo(() => dayOffs.filter((d) => d.status === 'Pendente').length, [dayOffs]);

  const todayOTRows = useMemo(() => {
    const t = today();
    return overtimes.filter((o) => o.date === t).flatMap((o) =>
      o.employees.map((e) => {
        const emp = employees.find((em) => em.id === e.employee_id);
        return emp ? { emp, start: e.start, end: e.end } : null;
      }).filter(Boolean)
    ) as { emp: (typeof employees)[0]; start: string; end: string }[];
  }, [overtimes, employees]);

  // Ranking de hora extra por funcionário no mês selecionado
  const overtimeRanking = useMemo(() => {
    const filtered = overtimes.filter((o) => rankingMonth ? o.date.startsWith(rankingMonth) : true);
    const empMap: Record<number, { hours: number; days: { date: string; start: string; end: string; hours: number; type: string }[] }> = {};
    filtered.forEach((ot) => {
      ot.employees.forEach((oe) => {
        const h = calcHours(oe.start, oe.end);
        if (!empMap[oe.employee_id]) empMap[oe.employee_id] = { hours: 0, days: [] };
        empMap[oe.employee_id].hours += h;
        empMap[oe.employee_id].days.push({ date: ot.date, start: oe.start, end: oe.end, hours: h, type: ot.type });
      });
    });
    return Object.entries(empMap).map(([id, data]) => ({
      emp: employees.find((e) => e.id === Number(id)),
      hours: Math.round(data.hours * 10) / 10,
      days: data.days.sort((a, b) => b.date.localeCompare(a.date)),
      occurrences: data.days.length,
    })).filter((r) => r.emp).sort((a, b) => b.hours - a.hours);
  }, [overtimes, employees, rankingMonth]);

  const zeroOTEmps = useMemo(() => {
    const activeEmps = employees.filter((e) => e.status === 'Ativo');
    const withOT = new Set(overtimeRanking.map((r) => r.emp?.id));
    return activeEmps.filter((e) => !withOT.has(e.id));
  }, [employees, overtimeRanking]);

  const detailDays = useMemo(() => {
    if (!detailEmp) return [];
    const filtered = overtimes.filter((o) => rankingMonth ? o.date.startsWith(rankingMonth) : true);
    const days: { date: string; start: string; end: string; hours: number; type: string }[] = [];
    filtered.forEach((ot) => {
      const oe = ot.employees.find((e) => e.employee_id === detailEmp.id);
      if (oe) days.push({ date: ot.date, start: oe.start, end: oe.end, hours: calcHours(oe.start, oe.end), type: ot.type });
    });
    return days.sort((a, b) => b.date.localeCompare(a.date));
  }, [detailEmp, overtimes, rankingMonth]);

  const detailTotalHours = useMemo(() => detailDays.reduce((s, d) => s + d.hours, 0), [detailDays]);
  const detailRank = useMemo(() => overtimeRanking.findIndex((r) => r.emp?.id === detailEmp?.id) + 1, [overtimeRanking, detailEmp]);

  const absChartData = useMemo(() => DAYS.map((d) => ({
    name: d,
    ausências: absences.filter((a) => { const date = new Date(a.date); return DAYS[(date.getDay() + 6) % 7] === d; }).length,
  })), [absences]);

  const monthlyData = useMemo(() => {
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return labels.map((m, i) => {
      const ms = String(i + 1).padStart(2, '0');
      return { name: m, abs: absences.filter((a) => a.date.includes(`-${ms}-`)).length, extra: overtimes.filter((o) => o.date.includes(`-${ms}-`)).reduce((s, o) => s + o.employees.length, 0) };
    });
  }, [absences, overtimes]);

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, fontFamily: 'Outfit, sans-serif' }}>Dashboard</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4, fontWeight: 500, textTransform: 'capitalize', fontFamily: 'Outfit, sans-serif' }}>{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '8px 16px', fontSize: 13, color: 'var(--success)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)', animation: 'pulse 1.5s infinite' }} />
          SISTEMA ONLINE
        </div>
      </div>

      <div className="card-premium" style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, fontSize: 13, color: 'var(--success)', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
        Sincronização em tempo real ativa — dados protegidos e atualizados
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="👥" value={stats.active} label="Ativos" delta={`${stats.total} total`} accent="gold" />
        <StatCard icon="🚫" value={stats.absToday} label="Ausências Hoje" delta={stats.absToday > 0 ? 'Requer atenção' : 'Normal'} deltaUp={stats.absToday === 0} accent="red" />
        <StatCard icon="🏖️" value={upcomingVacations.length} label="Férias em 30 dias" delta={`${vacations.filter((v) => v.status === 'Em férias').length} em andamento`} accent="blue" />
        <StatCard icon="🗓️" value={pendingDayOffs} label="Folgas Pendentes" delta="A utilizar" deltaUp={pendingDayOffs === 0} accent="green" />
      </div>

      {/* Férias alert */}
      {upcomingVacations.length > 0 && (
        <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold)', fontFamily: 'Outfit, sans-serif' }}>Alertas de Férias — próximos 30 dias</span>
            <span style={{ background: 'var(--gold)', color: '#000', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>{upcomingVacations.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {upcomingVacations.map((v) => {
              const emp = employees.find((e) => e.id === v.employee_id);
              const days = diffDays(v.start_date);
              return (
                <div key={v.id} style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 12, padding: '14px 18px', minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{emp?.name?.[0] ?? '?'}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{emp?.name ?? '—'}</div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>{fmtDate(v.start_date)} → {fmtDate(v.end_date)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, color: days === 0 ? '#f87171' : days <= 7 ? '#fb923c' : 'var(--gold)', background: days === 0 ? 'rgba(239,68,68,0.12)' : days <= 7 ? 'rgba(251,146,60,0.12)' : 'rgba(212,175,55,0.12)' }}>
                    {days === 0 ? '🔴 Começa hoje!' : days <= 7 ? `🟠 Em ${days} dia${days !== 1 ? 's' : ''}` : `🟡 Em ${days} dias`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="chart-grid-resp">
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Absenteísmo — Últimos 7 dias</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={absChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="ausências" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Horas Extras por Mês (Ano)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="extra" fill="rgba(212,175,55,0.6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Ranking Hora Extra ── */}
      <div className="card-premium" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'Outfit, sans-serif' }}>⏱️ Ranking — Hora Extra por Funcionário</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Clique em um funcionário para ver o detalhamento por dia</div>
          </div>
          <input type="month" className="field-input" style={{ width: 155 }} value={rankingMonth} onChange={(e) => setRankingMonth(e.target.value)} />
        </div>

        {overtimeRanking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>⏱️</div>
            <div>Nenhuma hora extra registrada neste período</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {overtimeRanking.map((row, idx) => {
              if (!row.emp) return null;
              const pct = (row.hours / overtimeRanking[0].hours) * 100;
              const medal = MEDALS[idx] ?? null;
              return (
                <div
                  key={row.emp.id}
                  onClick={() => setDetailEmp(row.emp!)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${idx === 0 ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'}`,
                    background: idx === 0 ? 'rgba(212,175,55,0.05)' : 'var(--bg-card)',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(212,175,55,0.4)'; el.style.background = 'rgba(212,175,55,0.07)'; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = idx === 0 ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'; el.style.background = idx === 0 ? 'rgba(212,175,55,0.05)' : 'var(--bg-card)'; }}
                >
                  <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 20 : 14, fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {medal ?? `${idx + 1}º`}
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: idx === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(156,163,175,0.12)', color: idx === 0 ? 'var(--gold)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    {row.emp.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.emp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.emp.company} · {row.occurrences} dia{row.occurrences !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ flex: 2, minWidth: 80, maxWidth: 200 }}>
                    <div style={{ height: 6, background: 'rgba(156,163,175,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: idx === 0 ? 'var(--gold)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : 'rgba(212,175,55,0.35)', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: idx === 0 ? 'var(--gold)' : 'var(--text-primary)', minWidth: 52, textAlign: 'right' }}>
                    {fmtHours(row.hours)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>›</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sem hora extra no período */}
        {zeroOTEmps.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Sem hora extra neste período ({zeroOTEmps.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {zeroOTEmps.map((emp) => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(156,163,175,0.06)', border: '1px solid rgba(156,163,175,0.12)', color: 'var(--text-muted)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(156,163,175,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{emp.name[0]}</div>
                  {emp.name.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's escalas */}
      <div className="card-premium" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Outfit, sans-serif' }}>Escalas de Hoje</div>
          <span className="pill pill-yellow" style={{ fontSize: 10 }}>{todayOTRows.length} colaboradores</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Matrícula</th><th>Nome</th><th>Empresa</th><th>Cargo</th><th>Entrada</th><th>Saída</th><th>Status</th></tr></thead>
            <tbody>
              {todayOTRows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Nenhuma escala para hoje</td></tr>
              ) : todayOTRows.map(({ emp, start, end }, i) => (
                <tr key={i}>
                  <td><code style={{ fontSize: 12, color: 'var(--gold)' }}>{emp.registration}</code></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{emp.name[0]}</div>
                    {emp.name}
                  </div></td>
                  <td>{emp.company}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                  <td><span className="pill pill-green">{start}</span></td>
                  <td><span className="pill pill-blue">{end}</span></td>
                  <td><span className="pill pill-yellow">Em escala</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Detalhes por Funcionário ── */}
      <Modal open={!!detailEmp} onClose={() => setDetailEmp(null)} title="Hora Extra — Detalhamento por Dia" maxWidth={600}
        footer={<button onClick={() => setDetailEmp(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600 }}>Fechar</button>}
      >
        {detailEmp && (
          <div>
            {/* Header do funcionário */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, marginBottom: 20 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{detailEmp.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{detailEmp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{detailEmp.role} · {detailEmp.company}</div>
                {detailRank > 0 && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontWeight: 700 }}>{MEDALS[detailRank - 1] ?? `${detailRank}º`} no ranking deste mês</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total no período</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)', lineHeight: 1.1, marginTop: 2 }}>{fmtHours(detailTotalHours)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{detailDays.length} dia{detailDays.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Listagem por dia */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Dias trabalhados em hora extra
            </div>
            {detailDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Nenhum registro neste período</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                {detailDays.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ minWidth: 80 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtDate(d.date)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: TYPE_COLOR[d.type] ?? 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', border: `1px solid ${TYPE_COLOR[d.type] ?? 'var(--border)'}44`, whiteSpace: 'nowrap' }}>{d.type}</span>
                    <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="pill pill-green" style={{ fontSize: 11 }}>{d.start}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                      <span className="pill pill-blue" style={{ fontSize: 11 }}>{d.end}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold)', minWidth: 48, textAlign: 'right' }}>
                      {fmtHours(d.hours)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        @media (max-width: 768px) {
          .chart-grid-resp { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppShell>
  );
}
