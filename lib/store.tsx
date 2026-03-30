'use client';
// lib/store.tsx  — Estado global via React Context (integrado com Supabase)

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Employee, Absence, Overtime, AuditLog } from '@/types';
import * as db from './supabase';
import { notify } from '@/components/Notifications';

interface StoreState {
  employees: Employee[];
  absences: Absence[];
  overtimes: Overtime[];
  auditLog: AuditLog[];
  loading: boolean;
}

interface StoreActions {
  refreshData: () => Promise<void>;
  addEmployee: (emp: Omit<Employee, 'id' | 'created_at'>) => Promise<void>;
  updateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
  addAbsence: (abs: Omit<Absence, 'id' | 'created_at'>) => Promise<void>;
  deleteAbsence: (id: number) => Promise<void>;
  addOvertime: (ot: { date: string; type: string; created_by: string }, emps: { employee_id: number; start_time: string; end_time: string }[]) => Promise<void>;
  deleteOvertime: (id: number) => Promise<void>;
  addAudit: (log: Omit<AuditLog, 'id' | 'created_at'>) => Promise<void>;
}

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: emps }, { data: abs }, { data: ots }, { data: logs }] = await Promise.all([
        db.fetchEmployees(),
        db.fetchAbsences(),
        db.fetchOvertimes(),
        db.fetchAuditLog(),
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
      notify('Erro ao cadastrar funcionário', 'error');
    }
  };

  const updateEmployee = async (id: number, data: Partial<Employee>) => {
    const { error, data: updated } = await db.updateEmployee(id, data);
    if (!error && updated) {
      setEmployees((s) => s.map((e) => (e.id === id ? updated : e)));
    } else {
      notify('Erro ao atualizar funcionário', 'error');
    }
  };

  const addAbsence = async (abs: Omit<Absence, 'id' | 'created_at'>) => {
    const { data, error } = await db.createAbsence(abs);
    if (!error && data) {
      setAbsences((s) => [data, ...s]);
    } else {
      notify('Erro ao registrar ausência', 'error');
    }
  };

  const deleteAbsence = async (id: number) => {
    const { error } = await db.deleteAbsence(id);
    if (!error) {
      setAbsences((s) => s.filter((a) => a.id !== id));
    } else {
      notify('Erro ao excluir registro', 'error');
    }
  };

  const addOvertime = async (ot: { date: string; type: string; created_by: string }, emps: { employee_id: number; start_time: string; end_time: string }[]) => {
    const { error } = await db.createOvertime(ot, emps);
    if (!error) {
      await refreshData(); // Recarrega completo para pegar relações complexas
    } else {
      notify('Erro ao criar escala', 'error');
    }
  };

  const deleteOvertime = async (id: number) => {
    const { error } = await db.deleteOvertime(id);
    if (!error) {
      setOvertimes((s) => s.filter((o) => o.id !== id));
    } else {
      notify('Erro ao excluir escala', 'error');
    }
  };

  const addAudit = async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
    const { error } = await db.insertAuditLog(log);
    if (!error) {
      // Opcional: atualizar localmente se quiser que apareça na hora
    }
  };

  return (
    <StoreContext.Provider value={{ 
      employees, absences, overtimes, auditLog, loading, 
      refreshData, addEmployee, updateEmployee, addAbsence, deleteAbsence, addOvertime, deleteOvertime, addAudit 
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
