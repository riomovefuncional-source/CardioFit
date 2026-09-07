-- CardioFit — 0005: anamnese estruturada, presença e testes funcionais
-- Incremental — não remove nada existente.

-- ------------------------------------------------------------
-- 1. ANAMNESE ESTRUTURADA
-- ------------------------------------------------------------

-- Regiões corporais afetadas (multi-seleção) direto em health_history
alter table public.health_history add column if not exists affected_regions text[] default '{}';
alter table public.health_history add column if not exists surgeries_history text;
alter table public.health_history add column if not exists hospitalizations text;
alter table public.health_history add column if not exists prior_illnesses text;
alter table public.health_history add column if not exists respiratory_diseases text;

-- Diagnósticos cardiológicos (múltiplos)
create table if not exists public.cardiac_diagnoses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  diagnosis text not null,
  diagnosis_date date,
  history text,
  severity text,
  treatment text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists cardiac_diagnoses_student_idx on public.cardiac_diagnoses(student_id);
alter table public.cardiac_diagnoses enable row level security;
create policy "cardiac_diagnoses: owner crud" on public.cardiac_diagnoses
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- Sintomas atuais, estruturados por sintoma
create table if not exists public.symptom_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  symptom text not null,
  present boolean not null default true,
  frequency text,
  intensity text,
  situation text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists symptom_records_student_idx on public.symptom_records(student_id);
alter table public.symptom_records enable row level security;
create policy "symptom_records: owner crud" on public.symptom_records
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- Caracterização da dor
create table if not exists public.pain_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  location text,
  side text,
  intensity numeric check (intensity between 0 and 10),
  pain_type text,
  onset text,
  duration text,
  frequency text,
  worsens_with text,
  improves_with text,
  pain_during_exercise boolean,
  pain_after_exercise boolean,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists pain_records_student_idx on public.pain_records(student_id);
alter table public.pain_records enable row level security;
create policy "pain_records: owner crud" on public.pain_records
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- Hábitos (um registro "atual" por aluno, como health_history)
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  activity_level text,
  weekly_frequency text,
  activity_type text,
  smoking text,
  alcohol text,
  sleep_quality text,
  stress_level text,
  diet text,
  hydration text,
  daily_routine text,
  work text,
  training_preference text,
  preferred_environment text,
  preferred_time text,
  equipment_preference text,
  effort_tolerance text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists habits_student_idx on public.habits(student_id);
alter table public.habits enable row level security;
create policy "habits: owner crud" on public.habits
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- 2. PRESENÇA / CALENDÁRIO
-- ------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('presente','ausente','cancelado','reposicao')),
  workout_session_id uuid references public.workout_sessions(id) on delete set null,
  recorded_by uuid not null references auth.users(id),
  origin text not null check (origin in ('profissional','aluno')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists attendance_student_idx on public.attendance(student_id, attendance_date);
alter table public.attendance enable row level security;
create policy "attendance: owner crud" on public.attendance
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "attendance: self read" on public.attendance
  for select using (exists (select 1 from public.students s where s.id = attendance.student_id and s.user_id = auth.uid()));

create or replace function public.fill_attendance_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    select owner_id into new.owner_id from public.students where id = new.student_id;
  end if;
  return new;
end;
$$;
drop trigger if exists attendance_fill_owner on public.attendance;
create trigger attendance_fill_owner before insert on public.attendance
  for each row execute procedure public.fill_attendance_owner();

create policy "attendance: self insert" on public.attendance
  for insert with check (
    origin = 'aluno' and recorded_by = auth.uid() and
    exists (select 1 from public.students s where s.id = attendance.student_id and s.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3. TESTES FUNCIONAIS — resultados flexíveis (um tipo de teste por linha, parâmetros em jsonb)
-- ------------------------------------------------------------
create table if not exists public.functional_test_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  test_type text not null,        -- 'chair_stand_30s' | 'grip_strength' | 'unipedal_stance' | outros no futuro
  test_date date not null default current_date,
  primary_result numeric,
  primary_unit text,
  parameters jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists functional_test_results_student_idx on public.functional_test_results(student_id, test_type, test_date);
alter table public.functional_test_results enable row level security;
create policy "functional_test_results: owner crud" on public.functional_test_results
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "functional_test_results: self read" on public.functional_test_results
  for select using (exists (select 1 from public.students s where s.id = functional_test_results.student_id and s.user_id = auth.uid()));
