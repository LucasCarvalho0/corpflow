-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Ativo', 'Inativo', 'Afastado', 'Desligado');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('Falta', 'Atestado', 'Justificada', 'Suspensao');

-- CreateEnum
CREATE TYPE "OvertimeType" AS ENUM ('Normal', 'Sabado', 'Domingo', 'Feriado', 'Extra');

-- CreateEnum
CREATE TYPE "VacationStatus" AS ENUM ('Agendado', 'Em férias', 'Concluído', 'Cancelado');

-- CreateEnum
CREATE TYPE "DayOffStatus" AS ENUM ('Pendente', 'Utilizada', 'Cancelada');

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "registration" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "work_schedule" TEXT NOT NULL DEFAULT '08:00 - 17:00',
    "shift" TEXT NOT NULL DEFAULT 'Manhã',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'Ativo',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "type" "AbsenceType" NOT NULL DEFAULT 'Falta',
    "observation" TEXT,
    "attachment_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "type" "OvertimeType" NOT NULL DEFAULT 'Normal',
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_employees" (
    "id" SERIAL NOT NULL,
    "overtime_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "overtime_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacations" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "observation" TEXT,
    "status" "VacationStatus" NOT NULL DEFAULT 'Agendado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_offs" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DayOffStatus" NOT NULL DEFAULT 'Pendente',
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT,
    "record_id" INTEGER,
    "old_data" JSONB,
    "new_data" JSONB,
    "detail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_registration_key" ON "employees"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_employees_overtime_id_employee_id_key" ON "overtime_employees"("overtime_id", "employee_id");

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_employees" ADD CONSTRAINT "overtime_employees_overtime_id_fkey" FOREIGN KEY ("overtime_id") REFERENCES "overtime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_employees" ADD CONSTRAINT "overtime_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_offs" ADD CONSTRAINT "day_offs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
