-- CardioFit — 0006: IPC com histórico + campo de descrição no exercício
-- Incremental — não remove nada existente.

alter table public.workout_exercises add column if not exists description text;

create table if not exists public.cardio_readiness (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  reading_date date not null default current_date,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  resting_hr int,
  spo2 numeric,
  sleep_hours numeric,
  symptoms text[] default '{}',
  pa_score numeric,
  fc_score numeric,
  spo2_score numeric,
  symptoms_score numeric,
  sleep_score numeric,
  ipc_score numeric,
  classification text,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cardio_readiness_student_idx on public.cardio_readiness(student_id, reading_date);
alter table public.cardio_readiness enable row level security;
create policy "cardio_readiness: owner crud" on public.cardio_readiness
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "cardio_readiness: self read" on public.cardio_readiness
  for select using (exists (select 1 from public.students s where s.id = cardio_readiness.student_id and s.user_id = auth.uid()));
