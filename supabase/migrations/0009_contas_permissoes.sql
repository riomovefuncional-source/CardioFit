-- CardioFit — 0009: correções de gestão de contas e visibilidade
-- Incremental — não remove nada existente.

-- ------------------------------------------------------------
-- 1. ORIGEM DO CHECK-IN (profissional/aluno)
-- ------------------------------------------------------------
alter table public.recovery_checkins add column if not exists origin text check (origin in ('profissional','aluno')) default 'profissional';

-- ------------------------------------------------------------
-- 2. list_professionals: excluir contas que já estão vinculadas como aluno
--    (o gatilho de signup cria profile para todo mundo; se a conta virou
--    aluno via students.user_id, ela não deve aparecer como professor)
-- ------------------------------------------------------------
create or replace function public.list_professionals()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  student_count bigint,
  last_activity timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id,
    u.email,
    p.full_name,
    p.role,
    p.active,
    (select count(*) from public.students s where s.owner_id = p.id) as student_count,
    (select max(ws.created_at) from public.workout_sessions ws where ws.owner_id = p.id) as last_activity
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
    and not exists (select 1 from public.students s where s.user_id = p.id)
  order by p.created_at asc;
$$;

-- ------------------------------------------------------------
-- 3. Admin pode ver TODAS as contas (professores + alunos vinculados) em uma lista única
-- ------------------------------------------------------------
create or replace function public.list_all_accounts()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  active boolean,
  linked_student_id uuid,
  linked_student_name text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id,
    u.email,
    p.full_name,
    p.role,
    p.active,
    s.id as linked_student_id,
    s.full_name as linked_student_name
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.students s on s.user_id = p.id
  where public.is_admin()
  order by p.created_at asc;
$$;
revoke all on function public.list_all_accounts() from public;
grant execute on function public.list_all_accounts() to authenticated;

-- ------------------------------------------------------------
-- 4. Admin pode promover/rebaixar entre professional e admin
-- ------------------------------------------------------------
create or replace function public.set_professional_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis';
  end if;
  if p_role not in ('professional','admin') then
    raise exception 'Papel inválido';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;
revoke all on function public.set_professional_role(uuid, text) from public;
grant execute on function public.set_professional_role(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 5. Desvincular conta de aluno (reverte um vínculo feito por engano)
-- ------------------------------------------------------------
create or replace function public.unlink_student_account(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.students where id = p_student_id;
  if v_owner is null then
    raise exception 'Aluno não encontrado';
  end if;
  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissão para desvincular este aluno';
  end if;
  update public.students set user_id = null where id = p_student_id;
end;
$$;
revoke all on function public.unlink_student_account(uuid) from public;
grant execute on function public.unlink_student_account(uuid) to authenticated;
