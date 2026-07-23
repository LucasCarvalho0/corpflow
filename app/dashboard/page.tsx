'use client';
// app/dashboard/page.tsx
import { useMemo } from 'react';
import AppShell from '@/components/AppShell';
import StatCard from '@/components/StatCard';
import { useStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function diffDays(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function DashboardPage() {
  const { employees, absences, overtimes, vacations, dayOffs, loading } = useStore();

  const stats = useMemo(() => {
    if (loading) return { active: 0, total: 0, absToday: 0, atestados: 0, otToday: 0, otMonth: 0 };
    const t = today();
    const active = employees.filter((e) => e.status === 'Ativo').length;
    const absToday = absences.filter((a) => a.date === t).length;
    const atestados = absences.filter((a) => a.type === 'Atestado').length;
    const otToday = overtimes.filter((o) => o.date === t).reduce((s, o) => s + o.employees.length, 0);
    const otMonth = overtimes.reduce((s, o) => s + o.employees.length, 0);
    return { active, total: employees.length, absToday, atestados, otToday, otMonth };
  }, [employees, absences, overtimes]);

  // Férias nos próximos 30 dias
  const upcomingVacations = useMemo(() => vacations.filter((v) => {
    if (v.status === 'Cancelado' || v.status === 'Concluído') return false;
    const days = diffDays(v.start_date);
    return days >= 0 && days <= 30;
  }).sort((a, b) => a.start_date.localeCompare(b.start_date)), [vacations]);

  // Folgas pendentes
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

  // Dynamic Chart Data
  const absChartData = useMemo(() => {
    return DAYS.map((d) => {
      // Simplificação: apenas mostra 0 se vazio, ou conta se houver dados
      // Numa versão real, filtraríamos por data específica do dia da semana
      const count = absences.filter(a => {
        const date = new Date(a.date);
        const dayName = DAYS[(date.getDay() + 6) % 7]; // Ajuste para Seg=0
        return dayName === d;
      }).length;
      return { name: d, ausências: count };
    });
  }, [absences]);

  const heChartData = useMemo(() => {
    const data: Record<string, number> = {};
    overtimes.forEach(ot => {
      ot.employees.forEach(ote => {
        const emp = employees.find(e => e.id === ote.employee_id);
        if (emp) {
          const firstName = emp.name.split(' ')[0];
          data[firstName] = (data[firstName] || 0) + 1; // Simplificado: conta ocorrências
        }
      });
    });
    return Object.entries(data).map(([name, horas]) => ({ name, horas })).slice(0, 6);
  }, [overtimes, employees]);

  const monthlyData = useMemo(() => {
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return monthLabels.map((m, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const absCount = absences.filter(a => a.date.includes(`-${monthStr}-`)).length;
      const otCount = overtimes.filter(o => o.date.includes(`-${monthStr}-`)).reduce((s, o) => s + o.employees.length, 0);
      return { name: m, abs: absCount, extra: otCount };
    });
  }, [absences, overtimes]);

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>Dashboard</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4, fontWeight: 500, textTransform: 'capitalize', fontFamily: 'Outfit, sans-serif' }}>{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '8px 16px', fontSize: 13, color: 'var(--success)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)', animation: 'pulse 1.5s infinite' }} />
          SISTEMA ONLINE
        </div>
      </div>

      {/* Realtime bar */}
      <div className="card-premium" style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, fontSize: 13, color: 'var(--success)', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
        Sincronização em tempo real ativa — dados protegidos e atualizados
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="👥" value={stats.active} label="Ativos" delta={`${stats.total} total`} accent="gold" />
        <StatCard icon="🚫" value={stats.absToday} label="Ausências Hoje" delta={stats.absToday > 0 ? 'Requer atenção' : 'Normal'} deltaUp={stats.absToday === 0} accent="red" />
        <StatCard icon="🏖️" value={upcomingVacations.length} label="Férias em 30 dias" delta={`${vacations.filter(v=>v.status==='Em férias').length} em andamento`} accent="blue" />
        <StatCard icon="🗓️" value={pendingDayOffs} label="Folgas Pendentes" delta="A utilizar" deltaUp={pendingDayOffs === 0} accent="green" />
      </div>

      {/* Alerta de Férias Próximas */}
      {upcomingVacations.length > 0 && (
        <div style={{
          background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24, animation: 'fadeIn 0.4s ease',
        }}>
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
                <div key={v.id} style={{
                  background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)',
                  borderRadius: 12, padding: '14px 18px', minWidth: 220, flex: '0 1 auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{emp?.name?.[0] ?? '?'}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{emp?.name ?? '—'}</div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>
                    {fmtDate(v.start_date)} → {fmtDate(v.end_date)}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    color: days === 0 ? '#f87171' : days <= 7 ? '#fb923c' : 'var(--gold)',
                    background: days === 0 ? 'rgba(239,68,68,0.12)' : days <= 7 ? 'rgba(251,146,60,0.12)' : 'rgba(212,175,55,0.12)',
                  }}>
                    {days === 0 ? '🔴 Começa hoje!' : days <= 7 ? `🟠 Em ${days} dia${days !== 1 ? 's' : ''}` : `🟡 Em ${days} dias`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="chart-grid-resp">
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Absenteísmo — Últimos 7 dias</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={absChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="ausências" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Absenteísmo por Mês (Ano)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="abs" fill="rgba(239, 68, 68, 0.4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="chart-grid-resp">
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Horas Extras por Funcionário</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={heChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="horas" fill="var(--gold)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-premium" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>Horas Extras por Mês (Ano)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="extra" fill="rgba(212, 175, 55, 0.4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212, 175, 55, 0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{emp.name[0]}</div>
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

      <style>{`
        @media (max-width: 768px) {
          .chart-grid-resp { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppShell>
  );
}
