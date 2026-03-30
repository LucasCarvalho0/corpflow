-- ============================================================
-- CorpFlow — Professional Supabase SQL Schema
-- Project: Employee Management, Absences, and Overtime
-- Version: 2.0
-- ============================================================

-- ── Setup: Extensions ─────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Setup: Custom Types (Enums) ──────────────────────────────
do $$ 
begin
    if not exists (select 1 from pg_type where typname = 'employee_status') then
        create type employee_status as enum ('Ativo', 'Inativo', 'Afastado', 'Desligado');
    end if;
    if not exists (select 1 from pg_type where typname = 'absence_type') then
        create type absence_type as enum ('Falta', 'Atestado', 'Justificada', 'Suspensão');
    end if;
    if not exists (select 1 from pg_type where typname = 'overtime_type') then
        create type overtime_type as enum ('Normal', 'Sábado', 'Domingo', 'Feriado', 'Extra');
    end if;
    if not exists (select 1 from pg_type where typname = 'audit_type') then
        create type audit_type as enum ('Login', 'Criação', 'Edição', 'Exclusão', 'Exportação', 'Segurança');
    end if;
end $$;

-- ── Table: Employees ──────────────────────────────────────────
create table if not exists employees (
  id              bigserial primary key,
  registration    text          not null unique, -- "reg" in frontend
  name            text          not null check (length(name) >= 3),
  company         text          not null,
  role            text          not null,
  work_schedule   text          not null default '08:00 - 17:00', -- "schedule" in frontend
  shift           text          not null default 'Manhã',
  status          employee_status not null default 'Ativo',
  is_active       boolean       not null default true, -- For soft deletes
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  metadata        jsonb         default '{}'::jsonb
);

-- ── Table: Absences ───────────────────────────────────────────
create table if not exists absences (
  id              bigserial primary key,
  employee_id     bigint        not null references employees(id) on delete cascade,
  date            date          not null,
  type            absence_type  not null default 'Falta',
  observation     text,
  attachment_url  text,          -- URL for documents/certificates
  created_by      uuid          references auth.users(id),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- ── Table: Overtime ───────────────────────────────────────────
create table if not exists overtime (
  id              bigserial primary key,
  date            date          not null,
  type            overtime_type not null default 'Normal',
  description     text,
  created_by      uuid          references auth.users(id),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- ── Table: Overtime Employees (Join Table) ────────────────────
create table if not exists overtime_employees (
  id              bigserial     primary key,
  overtime_id     bigint        not null references overtime(id) on delete cascade,
  employee_id     bigint        not null references employees(id) on delete cascade,
  start_time      time          not null,
  end_time        time          not null,
  unique(overtime_id, employee_id)
);

-- ── Table: Audit Log ──────────────────────────────────────────
create table if not exists audit_log (
  id              bigserial     primary key,
  user_id         uuid          references auth.users(id),
  user_email      text          not null,
  action          text          not null,
  table_name      text,
  record_id       bigint,
  old_data        jsonb,
  new_data        jsonb,
  detail          text          not null,
  type            audit_type    not null default 'Edição',
  ip_address      inet,
  created_at      timestamptz   not null default now()
);

-- ── Indexes for Performance ───────────────────────────────────
create index if not exists idx_employees_reg         on employees(registration);
create index if not exists idx_employees_name        on employees(name);
create index if not exists idx_employees_company     on employees(company);
create index if not exists idx_absences_date         on absences(date);
create index if not exists idx_absences_emp_id       on absences(employee_id);
create index if not exists idx_overtime_date         on overtime(date);
create index if not exists idx_overtime_emp_ot_id    on overtime_employees(overtime_id);
create index if not exists idx_audit_log_type        on audit_log(type);
create index if not exists idx_audit_log_created_at  on audit_log(created_at desc);

-- ── RLS: Row Level Security ──────────────────────────────────
alter table employees           enable row level security;
alter table absences            enable row level security;
alter table overtime            enable row level security;
alter table overtime_employees  enable row level security;
alter table audit_log           enable row level security;

-- Policies (Simplified for admin-only or authenticated-only access)
create policy "allow_read_auth" on employees           for select using (auth.role() = 'authenticated');
create policy "allow_read_auth" on absences            for select using (auth.role() = 'authenticated');
create policy "allow_read_auth" on overtime            for select using (auth.role() = 'authenticated');
create policy "allow_read_auth" on overtime_employees  for select using (auth.role() = 'authenticated');
create policy "allow_read_auth" on audit_log           for select using (auth.role() = 'authenticated');

create policy "allow_all_admin" on employees           for all    using (auth.uid() is not null);
create policy "allow_all_admin" on absences            for all    using (auth.uid() is not null);
create policy "allow_all_admin" on overtime            for all    using (auth.uid() is not null);
create policy "allow_all_admin" on overtime_employees  for all    using (auth.uid() is not null);
create policy "allow_all_admin" on audit_log           for all    using (auth.uid() is not null);

-- ── Functions & Triggers ──────────────────────────────────────

-- 1. Updated At Trigger
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_employees_updated_at before update on employees for each row execute function handle_updated_at();
create trigger trg_absences_updated_at  before update on absences  for each row execute function handle_updated_at();
create trigger trg_overtime_updated_at before update on overtime  for each row execute function handle_updated_at();

-- 2. Automatic Audit Trigger
create or replace function process_audit_log()
returns trigger language plpgsql security definer as $$
declare
    v_user_email text := (select email from auth.users where id = auth.uid());
begin
    if (tg_op = 'INSERT') then
        insert into audit_log (user_id, user_email, action, table_name, record_id, new_data, detail, type)
        values (auth.uid(), coalesce(v_user_email, 'system'), 'INSERT', tg_table_name, new.id, row_to_json(new)::jsonb, 'Novo registro criado', 'Criação');
        return new;
    elsif (tg_op = 'UPDATE') then
        insert into audit_log (user_id, user_email, action, table_name, record_id, old_data, new_data, detail, type)
        values (auth.uid(), coalesce(v_user_email, 'system'), 'UPDATE', tg_table_name, new.id, row_to_json(old)::jsonb, row_to_json(new)::jsonb, 'Registro atualizado', 'Edição');
        return new;
    elsif (tg_op = 'DELETE') then
        insert into audit_log (user_id, user_email, action, table_name, record_id, old_data, detail, type)
        values (auth.uid(), coalesce(v_user_email, 'system'), 'DELETE', tg_table_name, old.id, row_to_json(old)::jsonb, 'Registro removido', 'Exclusão');
        return old;
    end if;
    return null;
end;
$$;

-- Apply Audit to main tables
create trigger audit_employees after insert or update or delete on employees for each row execute function process_audit_log();
create trigger audit_absences  after insert or update or delete on absences  for each row execute function process_audit_log();
create trigger audit_overtime  after insert or update or delete on overtime  for each row execute function process_audit_log();

-- ── Seed Data (Realistic) ─────────────────────────────────────
insert into employees (registration, name, company, role, work_schedule, shift, status)
values
    ('001001', 'Arthur Cavalcanti', 'Matriz', 'Gerente de Operações', '08:00 - 17:00', 'Misto', 'Ativo'),
    ('001002', 'Beatriz Santos', 'Filial SP', 'Analista Senior', '09:00 - 18:00', 'Manhã', 'Ativo'),
    ('001003', 'Carlos Eduardo', 'Filial RJ', 'Coordenador Logístico', '07:00 - 16:00', 'Manhã', 'Ativo'),
    ('001004', 'Daniella Lima', 'Matriz', 'Técnica de Segurança', '08:00 - 17:00', 'Manhã', 'Ativo'),
    ('001005', 'Enzo Gabriel', 'Terceirizado', 'Auxiliar de Serviços', '14:00 - 22:00', 'Tarde', 'Ativo'),
    ('001006', 'Fabiana Rosa', 'Filial SP', 'Supervisora de RH', '08:00 - 17:00', 'Manhã', 'Ativo'),
    ('001007', 'Gilberto Gil', 'Matriz', 'Diretor Criativo', '09:00 - 18:00', 'Misto', 'Ativo')
on conflict (registration) do nothing;

-- End of Script
