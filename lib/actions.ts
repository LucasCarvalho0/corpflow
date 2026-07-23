'use server';

import prisma from './prisma';

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
  return handleAction(() => {
    let where: any = {};
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
    return prisma.absence.findMany({ where, orderBy: { date: 'desc' } });
  });
}

export async function createAbsence(data: any) {
  if (data.date) {
    data.date = new Date(data.date);
  }
  return handleAction(() => prisma.absence.create({ data }));
}

export async function deleteAbsence(id: number) {
  return handleAction(() => prisma.absence.delete({ where: { id } }));
}

// ── Overtime ────────────────────────────────────────────────────────────────

export async function fetchOvertimes() {
  return handleAction(() =>
    prisma.overtime.findMany({
      include: {
        employees: true,
      },
      orderBy: { date: 'desc' },
    })
  );
}

export async function createOvertime(
  overtimeData: { date: string; type: any; created_by?: string; description?: string },
  employees: { employee_id: number; start_time: string; end_time: string }[]
) {
  return handleAction(async () => {
    const otDate = new Date(overtimeData.date);
    const result = await prisma.overtime.create({
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
      include: {
        employees: true,
      },
    });
    return result;
  });
}

export async function deleteOvertime(id: number) {
  return handleAction(() => prisma.overtime.delete({ where: { id } }));
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog() {
  return handleAction(() => prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 200 }));
}

export async function insertAuditLog(data: any) {
  return handleAction(() => prisma.auditLog.create({ data }));
}

// ── Vacations ────────────────────────────────────────────────────────────────

export async function fetchVacations() {
  return handleAction(() => prisma.vacation.findMany({ orderBy: { start_date: 'asc' } }));
}

export async function createVacation(data: any) {
  if (data.start_date) data.start_date = new Date(data.start_date);
  if (data.end_date) data.end_date = new Date(data.end_date);
  return handleAction(() => prisma.vacation.create({ data }));
}

export async function updateVacation(id: number, data: any) {
  if (data.start_date) data.start_date = new Date(data.start_date);
  if (data.end_date) data.end_date = new Date(data.end_date);
  return handleAction(() => prisma.vacation.update({ where: { id }, data }));
}

export async function deleteVacation(id: number) {
  return handleAction(() => prisma.vacation.delete({ where: { id } }));
}

// ── Day Offs ─────────────────────────────────────────────────────────────────

export async function fetchDayOffs() {
  return handleAction(() => prisma.dayOff.findMany({ orderBy: { date: 'desc' } }));
}

export async function createDayOff(data: any) {
  if (data.date) data.date = new Date(data.date);
  return handleAction(() => prisma.dayOff.create({ data }));
}

export async function updateDayOff(id: number, data: any) {
  if (data.date) data.date = new Date(data.date);
  return handleAction(() => prisma.dayOff.update({ where: { id }, data }));
}

export async function deleteDayOff(id: number) {
  return handleAction(() => prisma.dayOff.delete({ where: { id } }));
}
