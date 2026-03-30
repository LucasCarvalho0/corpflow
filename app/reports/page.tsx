'use client';
// app/reports/page.tsx
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import Btn from '@/components/Btn';
import { useStore } from '@/lib/store';
import { notify } from '@/components/Notifications';
import {
  exportEmployeesToExcel, exportAbsencesToExcel, exportOvertimeToExcel, exportConsolidatedToExcel,
  exportEmployeesToPDF, exportAbsencesToPDF, exportOvertimeToPDF, exportConsolidatedToPDF,
} from '@/lib/export';

function thisMonth() { return new Date().toISOString().slice(0, 7); }

interface ReportCard {
  icon: string;
  title: string;
  desc: string;
  monthKey: string;
  onExcel: () => Promise<void>;
  onPDF: () => Promise<void>;
}

export default function ReportsPage() {
  const { employees, absences, overtimes } = useStore();
  const [months, setMonths] = useState<Record<string, string>>({
    abs: thisMonth(), ot: thisMonth(), emp: '', cons: thisMonth(),
  });
  const [loading, setLoading] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try {
      await fn();
      notify('Relatório exportado com sucesso!');
    } catch {
      notify('Erro ao exportar relatório', 'error');
    } finally {
      setLoading(null);
    }
  }

  const filteredAbs = absences.filter((a) => !months.abs || a.date.startsWith(months.abs));
  const filteredOT = overtimes.filter((o) => !months.ot || o.date.startsWith(months.ot));
  const filteredEmp = employees;

  const cards: ReportCard[] = [
    {
      icon: '📊', title: 'Relatório de Absenteísmo', monthKey: 'abs',
      desc: 'Análise completa de faltas, atestados e ausências justificadas por período.',
      onExcel: () => exportAbsencesToExcel(filteredAbs, employees),
      onPDF: () => exportAbsencesToPDF(filteredAbs, employees),
    },
    {
      icon: '⏱️', title: 'Relatório de Horas Extras', monthKey: 'ot',
      desc: 'Escalas, horas trabalhadas e análise por funcionário e empresa.',
      onExcel: () => exportOvertimeToExcel(filteredOT, employees),
      onPDF: () => exportOvertimeToPDF(filteredOT, employees),
    },
    {
      icon: '👤', title: 'Relatório de Funcionários', monthKey: 'emp',
      desc: 'Lista completa com dados cadastrais, status e informações de turno.',
      onExcel: () => exportEmployeesToExcel(filteredEmp),
      onPDF: () => exportEmployeesToPDF(filteredEmp),
    },
    {
      icon: '📈', title: 'Relatório Consolidado', monthKey: 'cons',
      desc: 'Visão executiva com todos os indicadores do período selecionado.',
      onExcel: () => exportConsolidatedToExcel(employees, absences.filter(a => a.date.startsWith(months.cons)), overtimes.filter(o => o.date.startsWith(months.cons)), months.cons),
      onPDF: () => exportConsolidatedToPDF(employees, absences.filter(a => a.date.startsWith(months.cons)), overtimes.filter(o => o.date.startsWith(months.cons)), months.cons),
    },
  ];

  return (
    <AppShell>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Relatórios</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Exportação de dados e análises</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {cards.map((c) => (
          <div key={c.title} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{c.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>{c.desc}</div>

            {c.monthKey !== 'emp' ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Período</div>
                <input className="field-input" type="month" value={months[c.monthKey]}
                  onChange={(e) => setMonths((m) => ({ ...m, [c.monthKey]: e.target.value }))} />
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Empresa</div>
                <select className="field-input">
                  <option value="">Todas as empresas</option>
                  {[...new Set(employees.map((e) => e.company))].map((co) => <option key={co}>{co}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="gold" size="sm" disabled={loading !== null}
                onClick={() => run(`${c.monthKey}-excel`, c.onExcel)}>
                {loading === `${c.monthKey}-excel` ? 'Exportando...' : '📥 Excel'}
              </Btn>
              <Btn size="sm" disabled={loading !== null}
                onClick={() => run(`${c.monthKey}-pdf`, c.onPDF)}>
                {loading === `${c.monthKey}-pdf` ? 'Exportando...' : '📄 PDF'}
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24, marginTop: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Resumo do período atual</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total de funcionários', value: employees.length },
            { label: 'Funcionários ativos', value: employees.filter((e) => e.status === 'Ativo').length },
            { label: 'Total de ausências', value: absences.length },
            { label: 'Escalas criadas', value: overtimes.length },
            { label: 'Em horas extras', value: overtimes.reduce((s, o) => s + o.employees.length, 0) },
            { label: 'Atestados', value: absences.filter((a) => a.type === 'Atestado').length },
          ].map((item) => (
            <div key={item.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
