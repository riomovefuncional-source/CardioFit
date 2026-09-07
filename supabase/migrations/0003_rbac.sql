-- CardioFit — 0003: papéis e permissões reais (Admin / Professor / Aluno)
-- Incremental — não remove nada existente, só adiciona.

-- ------------------------------------------------------------
-- 1. Helper: é admin?
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 2. Vínculo aluno ↔ usuário autenticado
-- ------------------------------------------------------------
alter table public.students add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists students_user_id_uidx on public.students(user_id) where user_id is not null;

-- ------------------------------------------------------------
-- 3. ADMIN → acesso total (bypassa owner_id em todas as tabelas)
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'students','audit_logs','health_history','medications','assessments',
    'functional_tests','workout_plans','workout_exercises','recovery_checkins',
    'workout_sessions','clinical_safety_rules','alerts','plans',
    'student_contracts','contract_history','payments'
  ]
  loop
    execute format(
      'drop policy if exists %L on public.%I;
       create policy %L on public.%I for all
         using (owner_id = auth.uid() or public.is_admin())
         with check (owner_id = auth.uid() or public.is_admin());',
      t || ': owner crud', t, t || ': owner crud', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4. ALUNO → leitura dos próprios dados
-- ------------------------------------------------------------
create policy "students: self read" on public.students
  for select using (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'health_history','assessments','functional_tests',
    'workout_plans','recovery_checkins','workout_sessions','alerts'
  ]
  loop
    execute format(
      'create policy %L on public.%I for select using (
         exists (select 1 from public.students s where s.id = %I.student_id and s.user_id = auth.uid())
       );',
      t || ': self read', t, t
    );
  end loop;
end $$;

-- exercícios: aluno lê via o treino -> aluno
create policy "workout_exercises: self read" on public.workout_exercises
  for select using (
    exists (
      select 1 from public.workout_plans wp
      join public.students s on s.id = wp.student_id
      where wp.id = workout_exercises.workout_plan_id and s.user_id = auth.uid()
    )
  );

-- aluno pode registrar seu próprio check-in pré-treino (owner_id preenchido automaticamente)
create or replace function public.fill_checkin_owner()
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

drop trigger if exists recovery_checkins_fill_owner on public.recovery_checkins;
create trigger recovery_checkins_fill_owner
  before insert on public.recovery_checkins
  for each row execute procedure public.fill_checkin_owner();

create policy "recovery_checkins: self insert" on public.recovery_checkins
  for insert with check (
    exists (select 1 from public.students s where s.id = recovery_checkins.student_id and s.user_id = auth.uid())
  );

-- feedback do aluno pós-treino: tabela própria (insert-only), nunca altera o registro do professor
create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  perceived_effort numeric check (perceived_effort between 0 and 10),
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.session_feedback enable row level security;

create policy "session_feedback: student insert own" on public.session_feedback
  for insert with check (
    exists (select 1 from public.students s where s.id = session_feedback.student_id and s.user_id = auth.uid())
  );

create policy "session_feedback: student read own" on public.session_feedback
  for select using (
    exists (select 1 from public.students s where s.id = session_feedback.student_id and s.user_id = auth.uid())
  );

create policy "session_feedback: owner read" on public.session_feedback
  for select using (
    exists (select 1 from public.students s where s.id = session_feedback.student_id and (s.owner_id = auth.uid() or public.is_admin()))
  );

-- ------------------------------------------------------------
-- 5. Vincular conta de aluno a um registro em students (professor ou admin)
-- ------------------------------------------------------------
create or replace function public.link_student_account(p_student_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid;
  v_user_id uuid;
begin
  select owner_id into v_owner from public.students where id = p_student_id;
  if v_owner is null then
    raise exception 'Aluno não encontrado';
  end if;
  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissão para vincular este aluno';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'Nenhuma conta encontrada com este e-mail. O aluno precisa criar a conta primeiro.';
  end if;

  update public.students set user_id = v_user_id where id = p_student_id;
end;
$$;

revoke all on function public.link_student_account(uuid, text) from public;
grant execute on function public.link_student_account(uuid, text) to authenticated;
