// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase connection details are missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth helpers ────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

// ── Employees ───────────────────────────────────────────────────────────────

export async function fetchEmployees() {
  return supabase.from('employees').select('*').order('name');
}

export async function createEmployee(data: Omit<import('@/types').Employee, 'id' | 'created_at'>) {
  return supabase.from('employees').insert([data]).select().single();
}

export async function updateEmployee(id: number, data: Partial<import('@/types').Employee>) {
  return supabase.from('employees').update(data).eq('id', id).select().single();
}

export async function deleteEmployee(id: number) {
  return supabase.from('employees').delete().eq('id', id);
}

// ── Absences ────────────────────────────────────────────────────────────────

export async function fetchAbsences(startDate?: string, endDate?: string) {
  let query = supabase.from('absences').select('*').order('date', { ascending: false });
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  return query;
}

export async function createAbsence(data: Omit<import('@/types').Absence, 'id' | 'created_at'>) {
  return supabase.from('absences').insert([data]).select().single();
}

export async function deleteAbsence(id: number) {
  return supabase.from('absences').delete().eq('id', id);
}

// ── Overtime ────────────────────────────────────────────────────────────────

export async function fetchOvertimes() {
  return supabase
    .from('overtime')
    .select('*, overtime_employees(*)')
    .order('date', { ascending: false });
}

export async function createOvertime(
  overtimeData: { date: string; type: string; created_by: string },
  employees: { employee_id: number; start_time: string; end_time: string }[]
) {
  const { data: ot, error } = await supabase
    .from('overtime')
    .insert([overtimeData])
    .select()
    .single();

  if (error || !ot) return { data: null, error };

  const empRows = employees.map((e) => ({ overtime_id: ot.id, ...e }));
  return supabase.from('overtime_employees').insert(empRows);
}

export async function deleteOvertime(id: number) {
  await supabase.from('overtime_employees').delete().eq('overtime_id', id);
  return supabase.from('overtime').delete().eq('id', id);
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog() {
  return supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
}

export async function insertAuditLog(data: {
  user_email: string;
  action: string;
  detail: string;
  type: string;
}) {
  return supabase.from('audit_log').insert([data]);
}

// ── Vacations ────────────────────────────────────────────────────────────────

export async function fetchVacations() {
  return supabase.from('vacations').select('*').order('start_date', { ascending: true });
}

export async function createVacation(data: Omit<import('@/types').Vacation, 'id' | 'created_at'>) {
  return supabase.from('vacations').insert([data]).select().single();
}

export async function updateVacation(id: number, data: Partial<import('@/types').Vacation>) {
  return supabase.from('vacations').update(data).eq('id', id).select().single();
}

export async function deleteVacation(id: number) {
  return supabase.from('vacations').delete().eq('id', id);
}

// ── Day Offs ─────────────────────────────────────────────────────────────────

export async function fetchDayOffs() {
  return supabase.from('day_offs').select('*').order('date', { ascending: false });
}

export async function createDayOff(data: Omit<import('@/types').DayOff, 'id' | 'created_at'>) {
  return supabase.from('day_offs').insert([data]).select().single();
}

export async function updateDayOff(id: number, data: Partial<import('@/types').DayOff>) {
  return supabase.from('day_offs').update(data).eq('id', id).select().single();
}

export async function deleteDayOff(id: number) {
  return supabase.from('day_offs').delete().eq('id', id);
}
