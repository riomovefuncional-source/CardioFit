-- ============================================================
-- CardioFit — schema inicial
-- Convenção: toda tabela de "eventos" (avaliações, sessões, cargas,
-- pagamentos, ajustes) é INSERT-only — nunca UPDATE/DELETE de linhas
-- antigas, para preservar histórico real (seção 17 do briefing).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PERFIS / EQUIPE (o profissional que usa o sistema)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'professional' check (role in ('professional','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: self read/update" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: toda tabela abaixo é isolada por owner_id (o profissional dono do dado),
-- assim múltiplos profissionais podem usar o mesmo projeto Supabase sem ver dados um do outro.

-- ------------------------------------------------------------
-- 2. ALUNOS
-- ------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  birth_date date,
  sex text check (sex in ('M','F','outro')),
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  occupation text,
  notes text,
  status text not null default 'ativo' check (status in ('ativo','inativo','pausado')),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_owner_idx on public.students(owner_id);
alter table public.students enable row level security;
create policy "students: owner crud" on public.students
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Histórico genérico de auditoria (seção 17): quem mudou o quê e quando
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_table text not null,
  entity_id uuid not null,
  action text not null,           -- insert / update / delete / status_change
  field_name text,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_table, entity_id);
alter table public.audit_logs enable row level security;
create policy "audit_logs: owner read/insert" on public.audit_logs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 3. ANAMNESE / HISTÓRICO DE SAÚDE
-- ------------------------------------------------------------
create table public.health_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  cardiovascular_diagnosis text,
  history_infarction boolean default false,
  heart_failure boolean default false,
  hypertension boolean default false,
  arrhythmia boolean default false,
  coronary_artery_disease boolean default false,
  family_history text,
  cardiovascular_procedures text,
  surgeries text,
  symptoms text[],                 -- dor torácica, dispneia, tontura, síncope, palpitação, fadiga, edema, intolerância
  risk_factors text[],             -- hipertensão, diabetes, dislipidemia, tabagismo, sedentarismo, obesidade, histórico familiar
  musculoskeletal_notes text,
  medical_followup text,
  created_at timestamptz not null default now()
);

create index health_history_student_idx on public.health_history(student_id);
alter table public.health_history enable row level security;
create policy "health_history: owner crud" on public.health_history
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  active_ingredient text,
  drug_class text,
  dose text,
  frequency text,
  schedule_time text,
  purpose text,
  notes text,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index medications_student_idx on public.medications(student_id);
alter table public.medications enable row level security;
create policy "medications: owner crud" on public.medications
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 4. AVALIAÇÃO FÍSICA (nunca sobrescrever — cada avaliação é uma linha nova)
-- ------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  assessment_date date not null default current_date,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric generated always as (
    case when height_cm is not null and height_cm > 0
    then round((weight_kg / ((height_cm/100.0) ^ 2))::numeric, 2)
    else null end
  ) stored,
  body_fat_pct numeric,
  lean_mass_kg numeric,
  skinfolds jsonb,                 -- { tricipital, subescapular, ... } — protocolo Pollock 3/7 dobras
  circumferences jsonb,            -- { cintura, quadril, braco, ... }
  basal_energy_expenditure numeric,
  vo2_estimated numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index assessments_student_idx on public.assessments(student_id, assessment_date);
alter table public.assessments enable row level security;
create policy "assessments: owner crud" on public.assessments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 5. AVALIAÇÃO FUNCIONAL
-- ------------------------------------------------------------
create table public.functional_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  test_date date not null default current_date,
  test_name text not null,          -- ex: "1RM supino", "Teste de caminhada 6 min"
  protocol text,
  result_value numeric,
  unit text,
  notes text,
  created_at timestamptz not null default now()
);

create index functional_tests_student_idx on public.functional_tests(student_id, test_date);
alter table public.functional_tests enable row level security;
create policy "functional_tests: owner crud" on public.functional_tests
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 6. TREINOS (prescrição)
-- ------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,               -- ex: "Treino A"
  objective text,
  phase text,
  frequency_per_week int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index workout_plans_student_idx on public.workout_plans(student_id);
alter table public.workout_plans enable row level security;
create policy "workout_plans: owner crud" on public.workout_plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  movement_pattern text,
  sets int,
  reps text,                        -- texto pois pode ser "8-12" ou "até a falha"
  load_kg numeric,
  rest_seconds int,
  target_rpe numeric,
  order_index int not null default 0,
  notes text
);

create index workout_exercises_plan_idx on public.workout_exercises(workout_plan_id);
alter table public.workout_exercises enable row level security;
create policy "workout_exercises: owner crud" on public.workout_exercises
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 7. CHECK-IN PRÉ-TREINO / MONITORAMENTO CARDIOVASCULAR
-- ------------------------------------------------------------
create table public.recovery_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  checkin_at timestamptz not null default now(),
  systolic_bp int,
  diastolic_bp int,
  heart_rate int,
  spo2 numeric,
  sleep_quality int check (sleep_quality between 1 and 5),
  energy_level int check (energy_level between 1 and 5),
  pain_level int check (pain_level between 0 and 10),
  fatigue_level int check (fatigue_level between 1 and 5),
  symptoms text[],
  notes text
);

create index recovery_checkins_student_idx on public.recovery_checkins(student_id, checkin_at);
alter table public.recovery_checkins enable row level security;
create policy "recovery_checkins: owner crud" on public.recovery_checkins
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 8. SESSÃO DE TREINO REALIZADA + CARGA
-- ------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  recovery_checkin_id uuid references public.recovery_checkins(id) on delete set null,
  session_date timestamptz not null default now(),
  duration_minutes numeric,
  rpe numeric,                       -- PSE 0-10
  session_load numeric generated always as (
    case when duration_minutes is not null and rpe is not null
    then duration_minutes * rpe else null end
  ) stored,                          -- carga da sessão = duração x PSE
  symptoms text[],
  post_systolic_bp int,
  post_diastolic_bp int,
  post_heart_rate int,
  post_spo2 numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index workout_sessions_student_idx on public.workout_sessions(student_id, session_date);
alter table public.workout_sessions enable row level security;
create policy "workout_sessions: owner crud" on public.workout_sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 9. ALERTAS DE SEGURANÇA (regras configuráveis e versionadas)
-- ------------------------------------------------------------
create table public.clinical_safety_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  field_name text not null,          -- ex: 'systolic_bp', 'spo2', 'heart_rate'
  operator text not null check (operator in ('gt','gte','lt','lte','eq')),
  threshold numeric not null,
  unit text,
  severity text not null check (severity in ('amarelo','vermelho')),
  message text not null,
  recommended_action text,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now()
);

alter table public.clinical_safety_rules enable row level security;
create policy "clinical_safety_rules: owner crud" on public.clinical_safety_rules
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_table text not null,        -- 'recovery_checkins' | 'workout_sessions'
  source_id uuid not null,
  rule_id uuid references public.clinical_safety_rules(id) on delete set null,
  level text not null check (level in ('amarelo','vermelho')),
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index alerts_student_idx on public.alerts(student_id, created_at);
alter table public.alerts enable row level security;
create policy "alerts: owner crud" on public.alerts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 10. FINANCEIRO — arquitetura flexível (contrato individual é a fonte oficial)
-- ------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  default_price numeric not null,
  default_periodicity text not null default 'mensal'
    check (default_periodicity in ('semanal','quinzenal','mensal','trimestral','semestral','anual','personalizada')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;
create policy "plans: owner crud" on public.plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.student_contracts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  agreed_value numeric not null,        -- valor oficial de cobrança deste aluno (nunca herda mudanças do plano)
  periodicity text not null default 'mensal'
    check (periodicity in ('semanal','quinzenal','mensal','trimestral','semestral','anual','personalizada')),
  due_day int,                          -- dia de vencimento (1-31)
  first_charge_date date,
  installments int,
  installment_value numeric,
  payment_method text,
  discount numeric default 0,
  surcharge numeric default 0,
  fine numeric default 0,
  interest numeric default 0,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'ativo'
    check (status in ('ativo','pausado','cancelado','encerrado','cortesia')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_contracts_student_idx on public.student_contracts(student_id);
alter table public.student_contracts enable row level security;
create policy "student_contracts: owner crud" on public.student_contracts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Histórico obrigatório de qualquer alteração contratual (seção 22)
create table public.contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.student_contracts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  reason text,
  changed_at timestamptz not null default now()
);

alter table public.contract_history enable row level security;
create policy "contract_history: owner crud" on public.contract_history
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.student_contracts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  due_date date not null,
  paid_date date,
  method text,                         -- pix, cartao, dinheiro, transferencia, outro (livre, não é enum fixo)
  reference text,
  status text not null default 'pendente'
    check (status in ('pago','pendente','atrasado','parcial','cancelado')),
  notes text,
  created_at timestamptz not null default now()
);

create index payments_student_idx on public.payments(student_id, due_date);
create index payments_contract_idx on public.payments(contract_id);
alter table public.payments enable row level security;
create policy "payments: owner crud" on public.payments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Trigger genérico: mantém updated_at em students e student_contracts
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger students_set_updated_at before update on public.students
  for each row execute procedure public.set_updated_at();

create trigger student_contracts_set_updated_at before update on public.student_contracts
  for each row execute procedure public.set_updated_at();
