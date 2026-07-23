// types/index.ts

export type EmployeeStatus = 'Ativo' | 'Inativo';
export type AbsenceType = 'Falta' | 'Atestado' | 'Justificada';
export type OvertimeType = 'Normal' | 'Sábado' | 'Extra';
export type AuditActionType = 'Login' | 'Criação' | 'Edição' | 'Exclusão' | 'Exportação';
export type VacationStatus = 'Agendado' | 'Em férias' | 'Concluído' | 'Cancelado';
export type DayOffStatus = 'Pendente' | 'Utilizada' | 'Cancelada';

export interface Employee {
  id: number;
  registration: string;
  name: string;
  company: string;
  role: string;
  work_schedule: string;
  shift: string;
  status: EmployeeStatus;
  created_at?: string;
}

export interface Absence {
  id: number;
  date: string;
  employee_id: number;
  type: AbsenceType;
  observation?: string;
  created_at?: string;
}

export interface OvertimeEmployee {
  employee_id: number;
  start: string;
  end: string;
}

export interface Overtime {
  id: number;
  date: string;
  type: OvertimeType;
  created_by: string;
  employees: OvertimeEmployee[];
  created_at?: string;
}

export type AuditType = 'Login' | 'Criação' | 'Edição' | 'Exclusão' | 'Exportação' | 'Segurança';

export interface AuditLog {
  id?: number;
  time?: string; // Legacy/UI formatting
  created_at?: string; // From Supabase
  user_email: string;
  action: string;
  detail: string;
  type: AuditType;
}

export interface Vacation {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  observation?: string;
  status: VacationStatus;
  created_at?: string;
}

export interface DayOff {
  id: number;
  employee_id: number;
  date: string;
  reason: string;
  status: DayOffStatus;
  observation?: string;
  created_at?: string;
}

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  absences_today: number;
  atestados_month: number;
  overtime_today: number;
  overtime_month: number;
}
