-- CardioFit — schema inicial (MVP)
-- Execute este arquivo inteiro no SQL Editor do Supabase (projeto ssljrumnkqvwzscotfsc).
-- Idempotente: pode rodar de novo sem duplicar (usa IF NOT EXISTS / OR REPLACE onde possível).

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. ALUNOS
-- =========================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  sex text check (sex in ('M','F','outro')),
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  profession text,
  notes text,
  status text not null default 'ativo' check (status in ('ativo','inativo','pausado')),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. ANAMNESE / HISTÓRICO DE SAÚDE
-- =========================================================
create table if not exists public.health_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  cardiovascular_diagnosis jsonb default '{}'::jsonb,   -- infarto, IC, HAS, arritmias, DAC, histórico familiar, cirurgias
  symptoms jsonb default '{}'::jsonb,                   -- dor torácica, dispneia, tontura, síncope, palpitação, fadiga, edema
  risk_factors jsonb default '{}'::jsonb,                -- HAS, diabetes, dislipidemia, tabagismo, sedentarismo, obesidade
  musculoskeletal jsonb default '{}'::jsonb,             -- lesões, dores, limitações, cirurgias, articulações
  medical_followup text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  active_ingredient text,
  class text,
  dose text,
  frequency text,
  schedule text,
  purpose text,
  notes text,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. AVALIAÇÃO FÍSICA E FUNCIONAL
-- =========================================================
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric generated always as (
    case when height_cm is not null and height_cm > 0 and weight_kg is not null
      then round((weight_kg / ((height_cm/100.0)^2))::numeric, 2)
      else null end
  ) stored,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  circumferences jsonb default '{}'::jsonb,
  skinfolds jsonb default '{}'::jsonb,
  bmr numeric,
  vo2_estimated numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.functional_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  protocol text,
  result text,
  unit text,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 4. TREINOS E SESSÕES
-- =========================================================
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  objective text,
  phase text,
  period_start date,
  period_end date,
  frequency_per_week int,
  status text not null default 'ativo' check (status in ('ativo','concluido','cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  movement_pattern text,
  sets int,
  reps text,
  load text,
  time_seconds int,
  rest_seconds int,
  intensity text,
  rpe_target numeric,
  notes text,
  order_index int not null default 0
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  date date not null default current_date,
  duration_minutes numeric,
  rpe numeric,
  session_load numeric generated always as (duration_minutes * rpe) stored,
  symptoms jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. MONITORAMENTO CARDIOVASCULAR E PRONTIDÃO
-- =========================================================
create table if not exists public.cardiovascular_monitoring (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  type text not null check (type in ('pre','pos')),
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  spo2 int,
  sleep_quality int,
  energy int,
  pain int,
  fatigue int,
  symptoms jsonb default '{}'::jsonb,
  notes text,
  recorded_at timestamptz not null default now()
);

create table if not exists public.readiness_index (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  monitoring_id uuid references public.cardiovascular_monitoring(id) on delete set null,
  score numeric not null check (score >= 0 and score <= 100),
  level text not null check (level in ('verde','amarelo','vermelho')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 6. ALERTAS DE SEGURANÇA (regras configuráveis)
-- =========================================================
create table if not exists public.clinical_safety_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  field text not null,          -- ex: 'spo2', 'heart_rate', 'blood_pressure_systolic'
  operator text not null check (operator in ('<','<=','>','>=','=')),
  threshold numeric not null,
  unit text,
  severity text not null check (severity in ('verde','amarelo','vermelho')),
  message text not null,
  recommended_action text,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  rule_id uuid references public.clinical_safety_rules(id) on delete set null,
  severity text not null check (severity in ('verde','amarelo','vermelho')),
  message text not null,
  recommended_action text,
  status text not null default 'aberto' check (status in ('aberto','reconhecido','resolvido')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 7. FINANCEIRO
-- =========================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_price numeric not null,
  default_periodicity text not null default 'mensal',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.student_contracts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  custom_name text,
  agreed_value numeric not null,
  periodicity text not null default 'mensal',
  due_day int,
  first_billing_date date,
  installments int,
  payment_method text,
  discount numeric default 0,
  surcharge numeric default 0,
  fine numeric default 0,
  interest numeric default 0,
  notes text,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'ativo' check (status in ('ativo','pausado','cancelado','encerrado','cortesia')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.student_contracts(id) on delete cascade,
  field_changed text not null,
  old_value text,
  new_value text,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.student_contracts(id) on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  method text,
  reference text,
  installment_number int,
  status text not null default 'pago' check (status in ('pago','pendente','atrasado','parcial')),
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 8. ÍNDICES
-- =========================================================
create index if not exists idx_students_owner on public.students(owner_id);
create index if not exists idx_health_history_student on public.health_history(student_id);
create index if not exists idx_medications_student on public.medications(student_id);
create index if not exists idx_assessments_student on public.assessments(student_id);
create index if not exists idx_functional_tests_student on public.functional_tests(student_id);
create index if not exists idx_workout_plans_student on public.workout_plans(student_id);
create index if not exists idx_workout_exercises_plan on public.workout_exercises(workout_plan_id);
create index if not exists idx_workout_sessions_student on public.workout_sessions(student_id);
create index if not exists idx_cv_monitoring_student on public.cardiovascular_monitoring(student_id);
create index if not exists idx_readiness_student on public.readiness_index(student_id);
create index if not exists idx_alerts_student on public.alerts(student_id);
create index if not exists idx_contracts_student on public.student_contracts(student_id);
create index if not exists idx_payments_contract on public.payments(contract_id);

-- =========================================================
-- 9. ROW LEVEL SECURITY
-- =========================================================
alter table public.students enable row level security;
alter table public.health_history enable row level security;
alter table public.medications enable row level security;
alter table public.assessments enable row level security;
alter table public.functional_tests enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.cardiovascular_monitoring enable row level security;
alter table public.readiness_index enable row level security;
alter table public.clinical_safety_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.plans enable row level security;
alter table public.student_contracts enable row level security;
alter table public.contract_history enable row level security;
alter table public.payments enable row level security;

-- students: dono direto
drop policy if exists "owner_all_students" on public.students;
create policy "owner_all_students" on public.students
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- plans / clinical_safety_rules: dono direto
drop policy if exists "owner_all_plans" on public.plans;
create policy "owner_all_plans" on public.plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner_all_rules" on public.clinical_safety_rules;
create policy "owner_all_rules" on public.clinical_safety_rules
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- tabelas filhas de students: dono via join
do $$
declare
  t text;
begin
  foreach t in array array[
    'health_history','medications','assessments','functional_tests',
    'workout_plans','workout_sessions','cardiovascular_monitoring',
    'readiness_index','alerts'
  ]
  loop
    execute format($f$
      drop policy if exists "owner_via_student" on public.%I;
      create policy "owner_via_student" on public.%I
        for all using (
          exists (select 1 from public.students s where s.id = %I.student_id and s.owner_id = auth.uid())
        ) with check (
          exists (select 1 from public.students s where s.id = %I.student_id and s.owner_id = auth.uid())
        );
    $f$, t, t, t, t);
  end loop;
end $$;

-- workout_exercises: dono via workout_plans -> students
drop policy if exists "owner_via_plan" on public.workout_exercises;
create policy "owner_via_plan" on public.workout_exercises
  for all using (
    exists (
      select 1 from public.workout_plans wp
      join public.students s on s.id = wp.student_id
      where wp.id = workout_exercises.workout_plan_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workout_plans wp
      join public.students s on s.id = wp.student_id
      where wp.id = workout_exercises.workout_plan_id and s.owner_id = auth.uid()
    )
  );

-- student_contracts: dono via students
drop policy if exists "owner_via_student_contracts" on public.student_contracts;
create policy "owner_via_student_contracts" on public.student_contracts
  for all using (
    exists (select 1 from public.students s where s.id = student_contracts.student_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s where s.id = student_contracts.student_id and s.owner_id = auth.uid())
  );

-- contract_history / payments: dono via student_contracts -> students
drop policy if exists "owner_via_contract_history" on public.contract_history;
create policy "owner_via_contract_history" on public.contract_history
  for all using (
    exists (
      select 1 from public.student_contracts c
      join public.students s on s.id = c.student_id
      where c.id = contract_history.contract_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.student_contracts c
      join public.students s on s.id = c.student_id
      where c.id = contract_history.contract_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "owner_via_payments" on public.payments;
create policy "owner_via_payments" on public.payments
  for all using (
    exists (
      select 1 from public.student_contracts c
      join public.students s on s.id = c.student_id
      where c.id = payments.contract_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.student_contracts c
      join public.students s on s.id = c.student_id
      where c.id = payments.contract_id and s.owner_id = auth.uid()
    )
  );
