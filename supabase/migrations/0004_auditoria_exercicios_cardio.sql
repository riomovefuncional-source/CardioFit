-- CardioFit — 0004: auditoria, biblioteca de exercícios, blocos de sessão, cardio (teste ergométrico)
-- Incremental — não remove nada existente.

-- ------------------------------------------------------------
-- 1. AUDITORIA AUTOMÁTICA (treinos, prescrição, avaliações, dados clínicos, medicamentos, sessões)
-- ------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  v_owner := coalesce(new.owner_id, old.owner_id);
  insert into public.audit_logs (owner_id, entity_table, entity_id, action, old_value, new_value)
  values (
    v_owner,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    lower(TG_OP),
    case when TG_OP <> 'INSERT' then row_to_json(old)::text else null end,
    case when TG_OP <> 'DELETE' then row_to_json(new)::text else null end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workout_plans','workout_exercises','assessments',
    'health_history','medications','workout_sessions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I;', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute procedure public.audit_row_change();',
      t || '_audit', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. BIBLIOTECA DE EXERCÍCIOS
-- ------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,                  -- força, cardio, mobilidade, funcional
  modality text,                  -- musculação, hiit, mobilidade geral, etc.
  movement_pattern text,
  muscle_group text,
  equipment text,
  location text check (location in ('academia','casa','ar_livre','academia_cardio','casa_cardio','livre','outro')),
  level text check (level in ('iniciante','intermediario','avancado')),
  objective text,
  instructions text,
  notes text,
  media_url text,
  created_at timestamptz not null default now()
);

create index if not exists exercises_owner_idx on public.exercises(owner_id);
alter table public.exercises enable row level security;
create policy "exercises: owner crud" on public.exercises
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- 3. TREINOS EM BLOCOS + MODALIDADE/LOCAL + LIGAÇÃO COM BIBLIOTECA
-- ------------------------------------------------------------
alter table public.workout_plans
  add column if not exists modality text,
  add column if not exists location text check (location in ('academia','casa','ar_livre','academia_cardio','casa_cardio','livre','outro')),
  add column if not exists periodization_model text check (periodization_model in ('linear','ondulatoria','bissemanal'));

alter table public.workout_exercises
  add column if not exists exercise_id uuid references public.exercises(id) on delete set null,
  add column if not exists block text check (block in ('aquecimento','mobilidade','forca','funcional','cardio','volta_calma')),
  add column if not exists format text,          -- séries x reps / tempo / distância / circuito / EMOM / AMRAP
  add column if not exists percent_1rm numeric,
  add column if not exists rir numeric,
  add column if not exists cadence text;

-- ------------------------------------------------------------
-- 4. CARDIO — TESTE ERGOMÉTRICO
-- ------------------------------------------------------------
create table if not exists public.cardio_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  test_date date not null default current_date,
  protocol text,                  -- Bruce, Naughton, Ramp, etc.
  total_time_minutes numeric,
  borg_max numeric check (borg_max between 0 and 10),
  hr_rest int,
  hr_peak int,
  sbp_rest int,
  sbp_peak int,
  met_max numeric,
  vo2_peak numeric,
  hr_ischemia int,
  hr_angina int,
  hr_arrhythmia int,
  hr_limitation int,
  stop_reason text,
  created_at timestamptz not null default now()
);

create index if not exists cardio_tests_student_idx on public.cardio_tests(student_id, test_date);
alter table public.cardio_tests enable row level security;
create policy "cardio_tests: owner crud" on public.cardio_tests
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "cardio_tests: self read" on public.cardio_tests
  for select using (exists (select 1 from public.students s where s.id = cardio_tests.student_id and s.user_id = auth.uid()));
