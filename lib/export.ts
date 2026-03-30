// lib/export.ts
import type { Employee, Absence, Overtime } from '@/types';

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Excel Export (Styled with exceljs) ──────────────────────────────────────

export async function exportToExcel(
  filename: string,
  columns: { header: string; key: string; width?: number }[],
  rows: any[],
  sheetName = 'Dados',
  headerColor = 'FF000000', // Black default
  title = 'CORPFLOW - GESTÃO DE PERFORMANCE'
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add Company Logo/Name at the Top
  worksheet.mergeCells('A1', String.fromCharCode(64 + columns.length) + '1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } }; // White
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Setup Columns
  worksheet.columns = columns;

  // Add Header Row (Row 2 since A1 is the title)
  const headerRow = worksheet.getRow(2);
  headerRow.values = columns.map(c => c.header);
  
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }; // White
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF333333' } },
      bottom: { style: 'double', color: { argb: 'FFFFFFFF' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Add Data Rows
  rows.forEach((rowData, idx) => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      // Alternating row colors
      if (idx % 2 !== 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 5, 40);
  });

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function exportEmployeesToExcel(employees: Employee[]) {
  const columns = [
    { header: 'Matrícula', key: 'registration', width: 15 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Empresa', key: 'company', width: 15 },
    { header: 'Cargo', key: 'role', width: 20 },
    { header: 'Horário', key: 'work_schedule', width: 20 },
    { header: 'Turno', key: 'shift', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  await exportToExcel('Relatorio_Funcionarios', columns, employees, 'Funcionários', 'FFF97316', 'CADASTRO GERAL DE FUNCIONÁRIOS');
}

export async function exportAbsencesToExcel(absences: Absence[], employees: Employee[]) {
  const getEmp = (id: number) => employees.find((e) => e.id === id);
  const rows = absences.map((a) => {
    const emp = getEmp(a.employee_id);
    return {
      date: formatDate(a.date),
      registration: emp?.registration ?? '—',
      name: emp?.name ?? '—',
      company: emp?.company ?? '—',
      type: a.type,
      justification: a.observation ?? '—',
    };
  });
  const columns = [
    { header: 'Data', key: 'date', width: 15 },
    { header: 'Matrícula', key: 'registration', width: 15 },
    { header: 'Funcionário', key: 'name', width: 30 },
    { header: 'Empresa', key: 'company', width: 15 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Justificativa', key: 'justification', width: 40 },
  ];
  await exportToExcel('Relatorio_Absenteismo', columns, rows, 'Absenteísmo', 'FFEF4444', 'RELATÓRIO DE ABSENTEÍSMO');
}

export async function exportOvertimeToExcel(overtimes: Overtime[], employees: Employee[]) {
  const getEmp = (id: number) => employees.find((e) => e.id === id);
  const rows = overtimes.flatMap((ot) =>
    ot.employees.map((e) => {
      const emp = getEmp(e.employee_id);
      return {
        date: formatDate(ot.date),
        type: ot.type,
        registration: emp?.registration ?? '—',
        name: emp?.name ?? '—',
        company: emp?.company ?? '—',
        role: emp?.role ?? '—',
        start: e.start,
        end: e.end,
      };
    })
  );
  const columns = [
    { header: 'Data', key: 'date', width: 15 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Matrícula', key: 'registration', width: 15 },
    { header: 'Funcionário', key: 'name', width: 30 },
    { header: 'Empresa', key: 'company', width: 15 },
    { header: 'Cargo', key: 'role', width: 20 },
    { header: 'Entrada', key: 'start', width: 12 },
    { header: 'Saída', key: 'end', width: 12 },
  ];
  await exportToExcel('Relatorio_HoraExtra', columns, rows, 'Hora Extra', 'FF1E40AF', 'CONTROLE DE SAÍDA / HORA EXTRA');
}

// ── PDF Export ───────────────────────────────────────────────────────────────

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string
) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Custom Header
  doc.setFontSize(22);
  doc.setTextColor(212, 175, 55); // #d4af37 (Gold)
  doc.text('CorpFlow', 14, 20);

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(14, 24, 280, 24);

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 32);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: rows,
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: [0, 0, 0], textColor: [212, 175, 55], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 260, 200);
  }

  doc.save(`${filename}.pdf`);
}

export async function exportEmployeesToPDF(employees: Employee[]) {
  const headers = ['Matrícula', 'Nome', 'Empresa', 'Cargo', 'Horário', 'Turno', 'Status'];
  const rows = employees.map((e) => [e.registration, e.name, e.company, e.role, e.work_schedule, e.shift, e.status]);
  await exportToPDF('Relatório Geral de Funcionários', headers, rows, 'Relatorio_Funcionarios');
}

export async function exportAbsencesToPDF(absences: Absence[], employees: Employee[]) {
  const getEmp = (id: number) => employees.find((e) => e.id === id);
  const headers = ['Data', 'Matrícula', 'Funcionário', 'Empresa', 'Tipo', 'Justificativa'];
  const rows = absences.map((a) => {
    const emp = getEmp(a.employee_id);
    return [formatDate(a.date), emp?.registration ?? '—', emp?.name ?? '—', emp?.company ?? '—', a.type, a.observation ?? '—'];
  });
  await exportToPDF('Relatório de Absenteísmo', headers, rows, 'Relatorio_Absenteismo');
}

export async function exportOvertimeToPDF(overtimes: Overtime[], employees: Employee[]) {
  const getEmp = (id: number) => employees.find((e) => e.id === id);
  const headers = ['Data', 'Tipo', 'Matrícula', 'Funcionário', 'Empresa', 'Cargo', 'Entrada', 'Saída'];
  const rows = overtimes.flatMap((ot) =>
    ot.employees.map((e) => {
      const emp = getEmp(e.employee_id);
      return [formatDate(ot.date), ot.type, emp?.registration ?? '—', emp?.name ?? '—', emp?.company ?? '—', emp?.role ?? '—', e.start, e.end];
    })
  );
  await exportToPDF('Relatório de Escalas de Hora Extra', headers, rows, 'Relatorio_HoraExtra');
}

// ── Consolidated Export ──────────────────────────────────────────────────────

export async function exportConsolidatedToExcel(
  employees: Employee[],
  absences: Absence[],
  overtimes: Overtime[],
  period: string
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const applyPremiumStyle = (ws: any, title: string, cols: any[]) => {
    ws.mergeCells('A1', String.fromCharCode(64 + cols.length) + '1');
    const t = ws.getCell('A1');
    t.value = `CORPFLOW - ${title} [${period || 'Geral'}]`;
    t.font = { name: 'Arial Black', size: 14, color: { argb: 'FFD4AF25' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    t.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.columns = cols;
    const h = ws.getRow(2);
    h.values = cols.map(c => c.header);
    h.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFD4AF25' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
      cell.alignment = { horizontal: 'center' };
    });
  };

  // Sheet 1: Resumo
  const s1 = workbook.addWorksheet('Resumo Geral');
  const s1cols = [{ header: 'Métrica', key: 'label', width: 30 }, { header: 'Valor', key: 'val', width: 20 }];
  applyPremiumStyle(s1, 'RESUMO EXECUTIVO', s1cols);
  s1.addRow({ label: 'Total de Funcionários', val: employees.length });
  s1.addRow({ label: 'Funcionários Ativos', val: employees.filter(e => e.status === 'Ativo').length });
  s1.addRow({ label: 'Total de Ausências no Período', val: absences.length });
  s1.addRow({ label: 'Total de Escalas no Período', val: overtimes.length });
  s1.addRow({ label: 'Atestados Médicos', val: absences.filter(a => a.type === 'Atestado').length });

  // Sheet 2: Absenteísmo
  const s2 = workbook.addWorksheet('Absenteísmo');
  const s2cols = [
    { header: 'Data', key: 'date' }, { header: 'Nome', key: 'name' }, { header: 'Tipo', key: 'type' }, { header: 'Justificativa', key: 'obs' }
  ];
  applyPremiumStyle(s2, 'DETALHAMENTO ABSENTEÍSMO', s2cols);
  absences.forEach(a => {
    const e = employees.find(em => em.id === a.employee_id);
    s2.addRow({ date: formatDate(a.date), name: e?.name || '—', type: a.type, obs: a.observation || '—' });
  });

  // Sheet 3: Hora Extra
  const s3 = workbook.addWorksheet('Hora Extra');
  const s3cols = [
    { header: 'Data', key: 'date' }, { header: 'Tipo', key: 'type' }, { header: 'Nome', key: 'name' }, { header: 'Entrada', key: 's' }, { header: 'Saída', key: 'e' }
  ];
  applyPremiumStyle(s3, 'DETALHAMENTO HORA EXTRA', s3cols);
  overtimes.forEach(ot => {
    ot.employees.forEach(ote => {
      const e = employees.find(em => em.id === ote.employee_id);
      s3.addRow({ date: formatDate(ot.date), type: ot.type, name: e?.name || '—', s: ote.start, e: ote.end });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Relatorio_Consolidado_${period || 'Geral'}.xlsx`;
  anchor.click();
}

export async function exportConsolidatedToPDF(
  employees: Employee[],
  absences: Absence[],
  overtimes: Overtime[],
  period: string
) {
  const summaryHeaders = ['Indicador', 'Quantidade'];
  const summaryRows = [
    ['Funcionários Ativos', String(employees.filter(e => e.status === 'Ativo').length)],
    ['Total de Ausências', String(absences.length)],
    ['Total de Escalas', String(overtimes.length)],
    ['Atestados no Período', String(absences.filter(a => a.type === 'Atestado').length)],
  ];
  await exportToPDF(`Relatório Consolidado — Período: ${period || 'Geral'}`, summaryHeaders, summaryRows, 'Relatorio_Consolidado');
}
