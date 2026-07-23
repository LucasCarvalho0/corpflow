'use client';
// lib/store.tsx  — Estado global via React Context (integrado com Supabase)

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Employee, Absence, Overtime, AuditLog, Vacation, DayOff } from '@/types';
import * as db from './actions';
import { notify } from '@/components/Notifications';

interface StoreState {
  employees: Employee[];
  absences: Absence[];
  overtimes: Overtime[];
  auditLog: AuditLog[];
  vacations: Vacation[];
  dayOffs: DayOff[];
  loading: boolean;
}

interface StoreActions {
  refreshData: () => Promise<void>;
  addEmployee: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<void>;
  updateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: number) => Promise<void>;
  addAbsence: (abs: Omit<Absence, 'id' | 'created_at'>) => Promise<void>;
  deleteAbsence: (id: number) => Promise<void>;
  addOvertime: (ot: { date: string; type: string; created_by: string }, emps: { employee_id: number; start_time: string; end_time: string }[]) => Promise<void>;
  deleteOvertime: (id: number) => Promise<void>;
  addAudit: (log: Omit<AuditLog, 'id' | 'created_at'>) => Promise<void>;
  addVacation: (v: Omit<Vacation, 'id' | 'created_at'>) => Promise<void>;
  updateVacation: (id: number, data: Partial<Vacation>) => Promise<void>;
  deleteVacation: (id: number) => Promise<void>;
  addDayOff: (d: Omit<DayOff, 'id' | 'created_at'>) => Promise<void>;
  updateDayOff: (id: number, data: Partial<DayOff>) => Promise<void>;
  deleteDayOff: (id: number) => Promise<void>;
}

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: emps }, { data: abs }, { data: ots }, { data: logs }, { data: vacs }, { data: dos }] = await Promise.all([
        db.fetchEmployees(),
        db.fetchAbsences(),
        db.fetchOvertimes(),
        db.fetchAuditLog(),
        db.fetchVacations(),
        db.fetchDayOffs(),
      ]);
      if (emps) setEmployees(emps);
      if (abs) setAbsences(abs);
      if (ots) {
        const mappedOts = (ots as any[]).map((ot) => ({
          ...ot,
          employees: ot.overtime_employees?.map((oe: any) => ({
            employee_id: oe.employee_id,
            start: oe.start_time,
            end: oe.end_time,
          })) || [],
        }));
        setOvertimes(mappedOts as Overtime[]);
      }
      if (logs) setAuditLog(logs as any);
      if (vacs) setVacations(vacs as Vacation[]);
      if (dos) setDayOffs(dos as DayOff[]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      notify('Erro ao sincronizar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addEmployee = async (emp: Omit<Employee, 'id' | 'created_at'>) => {
    const { data, error } = await db.createEmployee(emp);
    if (!error && data) {
      setEmployees((s) => [...s, data]);
    } else {
      throw error || new Error('Erro ao cadastrar funcionário');
    }
  };

  const updateEmployee = async (id: number, data: Partial<Employee>) => {
    const { error, data: updated } = await db.updateEmployee(id, data);
    if (!error && updated) {
      setEmployees((s) => s.map((e) => (e.id === id ? updated : e)));
    } else {
      throw error || new Error('Erro ao atualizar funcionário');
    }
  };
  
  const deleteEmployee = async (id: number) => {
    const { error } = await db.deleteEmployee(id);
    if (!error) {
      setEmployees((s) => s.filter((e) => e.id !== id));
    } else {
      throw error || new Error('Erro ao excluir funcionário');
    }
  };

  const addAbsence = async (abs: Omit<Absence, 'id' | 'created_at'>) => {
    const { data, error } = await db.createAbsence(abs);
    if (!error && data) {
      setAbsences((s) => [data, ...s]);
    } else {
      throw error || new Error('Erro ao registrar ausência');
    }
  };

  const deleteAbsence = async (id: number) => {
    const { error } = await db.deleteAbsence(id);
    if (!error) {
      setAbsences((s) => s.filter((a) => a.id !== id));
    } else {
      throw error || new Error('Erro ao excluir registro');
    }
  };

  const addOvertime = async (ot: { date: string; type: string; created_by: string }, emps: { employee_id: number; start_time: string; end_time: string }[]) => {
    const { error } = await db.createOvertime(ot, emps);
    if (!error) {
      await refreshData();
    } else {
      throw error || new Error('Erro ao criar escala');
    }
  };

  const deleteOvertime = async (id: number) => {
    const { error } = await db.deleteOvertime(id);
    if (!error) {
      setOvertimes((s) => s.filter((o) => o.id !== id));
    } else {
      throw error || new Error('Erro ao excluir escala');
    }
  };

  const addAudit = async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
    const { error } = await db.insertAuditLog(log);
    if (!error) {
      // Opcional: atualizar localmente se quiser que apareça na hora
    }
  };

  // ── Vacations ──────────────────────────────────────────────────────────────

  const addVacation = async (v: Omit<Vacation, 'id' | 'created_at'>) => {
    const { data, error } = await db.createVacation(v);
    if (!error && data) {
      setVacations((s) => [...s, data as Vacation].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    } else {
      throw error || new Error('Erro ao registrar férias');
    }
  };

  const updateVacation = async (id: number, data: Partial<Vacation>) => {
    const { error, data: updated } = await db.updateVacation(id, data);
    if (!error && updated) {
      setVacations((s) => s.map((v) => (v.id === id ? updated as Vacation : v)));
    } else {
      throw error || new Error('Erro ao atualizar férias');
    }
  };

  const deleteVacation = async (id: number) => {
    const { error } = await db.deleteVacation(id);
    if (!error) {
      setVacations((s) => s.filter((v) => v.id !== id));
    } else {
      throw error || new Error('Erro ao excluir férias');
    }
  };

  // ── Day Offs ───────────────────────────────────────────────────────────────

  const addDayOff = async (d: Omit<DayOff, 'id' | 'created_at'>) => {
    const { data, error } = await db.createDayOff(d);
    if (!error && data) {
      setDayOffs((s) => [data as DayOff, ...s]);
    } else {
      throw error || new Error('Erro ao registrar folga');
    }
  };

  const updateDayOff = async (id: number, data: Partial<DayOff>) => {
    const { error, data: updated } = await db.updateDayOff(id, data);
    if (!error && updated) {
      setDayOffs((s) => s.map((d) => (d.id === id ? updated as DayOff : d)));
    } else {
      throw error || new Error('Erro ao atualizar folga');
    }
  };

  const deleteDayOff = async (id: number) => {
    const { error } = await db.deleteDayOff(id);
    if (!error) {
      setDayOffs((s) => s.filter((d) => d.id !== id));
    } else {
      throw error || new Error('Erro ao excluir folga');
    }
  };

  return (
    <StoreContext.Provider value={{ 
      employees, absences, overtimes, auditLog, vacations, dayOffs, loading, 
      refreshData, addEmployee, updateEmployee, deleteEmployee,
      addAbsence, deleteAbsence,
      addOvertime, deleteOvertime,
      addAudit,
      addVacation, updateVacation, deleteVacation,
      addDayOff, updateDayOff, deleteDayOff,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
