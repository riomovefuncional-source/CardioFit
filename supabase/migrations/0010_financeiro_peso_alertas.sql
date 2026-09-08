-- CardioFit — 0010: remove auditoria, peso do aluno, armazenamento
-- Incremental — não apaga dados existentes, só para de gerar novos registros de auditoria.

-- ------------------------------------------------------------
-- 1. REMOVER AUDITORIA AUTOMÁTICA (mantém a tabela e o histórico já gravado,
--    só para de criar novos registros a partir de agora)
-- ------------------------------------------------------------
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
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. PESO AUTO-REGISTRADO PELO ALUNO (não é a Avaliação oficial do profissional)
-- ------------------------------------------------------------
create table if not exists public.student_weight_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric not null,
  logged_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists student_weight_logs_student_idx on public.student_weight_logs(student_id, logged_at);
alter table public.student_weight_logs enable row level security;

create policy "student_weight_logs: owner crud" on public.student_weight_logs
  for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "student_weight_logs: self read" on public.student_weight_logs
  for select using (exists (select 1 from public.students s where s.id = student_weight_logs.student_id and s.user_id = auth.uid()));
create policy "student_weight_logs: self insert" on public.student_weight_logs
  for insert with check (exists (select 1 from public.students s where s.id = student_weight_logs.student_id and s.user_id = auth.uid()));

create or replace function public.fill_weight_log_owner()
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
drop trigger if exists student_weight_logs_fill_owner on public.student_weight_logs;
create trigger student_weight_logs_fill_owner
  before insert on public.student_weight_logs
  for each row execute procedure public.fill_weight_log_owner();

-- ------------------------------------------------------------
-- 3. ARMAZENAMENTO — tamanho do banco e limpeza de registros antigos
-- ------------------------------------------------------------
create or replace function public.get_storage_usage()
returns table (bytes bigint, pretty text)
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database()), pg_size_pretty(pg_database_size(current_database()))
  where public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid());
$$;
revoke all on function public.get_storage_usage() from public;
grant execute on function public.get_storage_usage() to authenticated;

-- ------------------------------------------------------------
-- 4. CHECKOUT DO ALUNO (feedback pós-treino completo)
-- ------------------------------------------------------------
alter table public.session_feedback add column if not exists symptoms text[] default '{}';
alter table public.session_feedback add column if not exists notes text;

-- Permite ao próprio profissional (ou admin) apagar alertas resolvidos antigos para liberar espaço
create or replace function public.cleanup_resolved_alerts(p_older_than_days int default 90)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.alerts
  where status = 'resolvido'
    and created_at < now() - (p_older_than_days || ' days')::interval
    and (owner_id = auth.uid() or public.is_admin());
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.cleanup_resolved_alerts(int) from public;
grant execute on function public.cleanup_resolved_alerts(int) to authenticated;
