'use server';

import prisma from './prisma';

// ── Serialização de Datas ─────────────────────────────────────────────────────
// O Prisma retorna campos DateTime como objetos Date do JS.
// Estas funções convertem cada entidade para o formato de string que o cliente espera (YYYY-MM-DD),
// evitando erros de runtime como "includes is not a function" nos componentes.

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function serializeAbsence(a: any) {
  return { ...a, date: toDateStr(a.date), created_at: toDateStr(a.created_at), updated_at: toDateStr(a.updated_at) };
}

function serializeOvertime(o: any) {
  return {
    ...o,
    date: toDateStr(o.date),
    created_at: toDateStr(o.created_at),
    updated_at: toDateStr(o.updated_at),
    employees: (o.employees || o.overtime_employees || []).map((oe: any) => ({
      employee_id: oe.employee_id,
      start: oe.start_time,
      end: oe.end_time,
    })),
  };
}

function serializeVacation(v: any) {
  return {
    ...v,
    start_date: toDateStr(v.start_date),
    end_date: toDateStr(v.end_date),
    created_at: toDateStr(v.created_at),
    updated_at: toDateStr(v.updated_at),
  };
}

function serializeDayOff(d: any) {
  return { ...d, date: toDateStr(d.date), created_at: toDateStr(d.created_at), updated_at: toDateStr(d.updated_at) };
}

function serializeAuditLog(l: any) {
  return { ...l, created_at: toDateStr(l.created_at) };
}

// Helper for wrapping Prisma results to match the expected format { data, error }
async function handleAction(action: () => Promise<any>): Promise<{ data: any; error: any }> {
  try {
    const data = await action();
    return { data, error: null };
  } catch (error: any) {
    console.error('Database Error:', error);
    return { data: null, error: error.message || 'Database error occurred' };
  }
}

// ── Employees ───────────────────────────────────────────────────────────────

export async function fetchEmployees() {
  return handleAction(() => prisma.employee.findMany({ orderBy: { name: 'asc' } }));
}

export async function createEmployee(data: any) {
  return handleAction(() => prisma.employee.create({ data }));
}

export async function updateEmployee(id: number, data: any) {
  return handleAction(() => prisma.employee.update({ where: { id }, data }));
}

export async function deleteEmployee(id: number) {
  return handleAction(() => prisma.employee.delete({ where: { id } }));
}

// ── Absences ────────────────────────────────────────────────────────────────

export async function fetchAbsences(startDate?: string, endDate?: string) {
  const { data, error } = await handleAction(() => {
    let where: any = {};
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
    return prisma.absence.findMany({ where, orderBy: { date: 'desc' } });
  });
  return { data: data ? data.map(serializeAbsence) : null, error };
}

export async function createAbsence(data: any) {
  if (data.date) data.date = new Date(data.date);
  const result = await handleAction(() => prisma.absence.create({ data }));
  return { data: result.data ? serializeAbsence(result.data) : null, error: result.error };
}

export async function deleteAbsence(id: number) {
  return handleAction(() => prisma.absence.delete({ where: { id } }));
}

// ── Overtime ────────────────────────────────────────────────────────────────

export async function fetchOvertimes() {
  const { data, error } = await handleAction(() =>
    prisma.overtime.findMany({
      include: { employees: true },
      orderBy: { date: 'desc' },
    })
  );
  return { data: data ? data.map(serializeOvertime) : null, error };
}

export async function createOvertime(
  overtimeData: { date: string; type: any; created_by?: string; description?: string },
  employees: { employee_id: number; start_time: string; end_time: string }[]
) {
  const result = await handleAction(async () => {
    const otDate = new Date(overtimeData.date);
    return prisma.overtime.create({
      data: {
        ...overtimeData,
        date: otDate,
        employees: {
          create: employees.map((emp) => ({
            employee_id: emp.employee_id,
            start_time: emp.start_time,
            end_time: emp.end_time,
          })),
        },
      },
      include: { employees: true },
    });
  });
  return { data: result.data ? serializeOvertime(result.data) : null, error: result.error };
}

export async function deleteOvertime(id: number) {
  return handleAction(() => prisma.overtime.delete({ where: { id } }));
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog() {
  const { data, error } = await handleAction(() =>
    prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 200 })
  );
  return { data: data ? data.map(serializeAuditLog) : null, error };
}

export async function insertAuditLog(data: any) {
  return handleAction(() => prisma.auditLog.create({ data }));
}

// ── Vacations ────────────────────────────────────────────────────────────────

export async function fetchVacations() {
  const { data, error } = await handleAction(() =>
    prisma.vacation.findMany({ orderBy: { start_date: 'asc' } })
  );
  return { data: data ? data.map(serializeVacation) : null, error };
}

export async function createVacation(data: any) {
  if (data.start_date) data.start_date = new Date(data.start_date);
  if (data.end_date) data.end_date = new Date(data.end_date);
  const result = await handleAction(() => prisma.vacation.create({ data }));
  return { data: result.data ? serializeVacation(result.data) : null, error: result.error };
}

export async function updateVacation(id: number, data: any) {
  if (data.start_date) data.start_date = new Date(data.start_date);
  if (data.end_date) data.end_date = new Date(data.end_date);
  const result = await handleAction(() => prisma.vacation.update({ where: { id }, data }));
  return { data: result.data ? serializeVacation(result.data) : null, error: result.error };
}

export async function deleteVacation(id: number) {
  return handleAction(() => prisma.vacation.delete({ where: { id } }));
}

// ── Day Offs ─────────────────────────────────────────────────────────────────

export async function fetchDayOffs() {
  const { data, error } = await handleAction(() =>
    prisma.dayOff.findMany({ orderBy: { date: 'desc' } })
  );
  return { data: data ? data.map(serializeDayOff) : null, error };
}

export async function createDayOff(data: any) {
  if (data.date) data.date = new Date(data.date);
  const result = await handleAction(() => prisma.dayOff.create({ data }));
  return { data: result.data ? serializeDayOff(result.data) : null, error: result.error };
}

export async function updateDayOff(id: number, data: any) {
  if (data.date) data.date = new Date(data.date);
  const result = await handleAction(() => prisma.dayOff.update({ where: { id }, data }));
  return { data: result.data ? serializeDayOff(result.data) : null, error: result.error };
}

export async function deleteDayOff(id: number) {
  return handleAction(() => prisma.dayOff.delete({ where: { id } }));
}
