-- CardioFit — 0008: alertas centralizados, professores ativos/inativos
-- Incremental — não remove nada existente.

-- ------------------------------------------------------------
-- 1. ALERTAS — categoria, título, prioridade, status
-- ------------------------------------------------------------
alter table public.alerts add column if not exists category text
  check (category in ('cardiovascular','treino','recuperacao','presenca','avaliacao','financeiro'))
  default 'cardiovascular';
alter table public.alerts add column if not exists title text;
alter table public.alerts add column if not exists priority text check (priority in ('baixa','media','alta')) default 'media';
alter table public.alerts add column if not exists status text check (status in ('novo','visualizado','resolvido')) default 'novo';

-- Sincroniza o campo legado "resolved" com o novo "status", nos dois sentidos
create or replace function public.sync_alert_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and new.status = 'resolvido' then
    new.resolved := true;
  elsif new.resolved is distinct from old.resolved and new.resolved = true then
    new.status := 'resolvido';
  end if;
  return new;
end;
$$;
drop trigger if exists alerts_sync_status on public.alerts;
create trigger alerts_sync_status before update on public.alerts
  for each row execute procedure public.sync_alert_status();

-- Título default a partir da mensagem, para alertas já existentes
update public.alerts set title = left(message, 60) where title is null;

-- ------------------------------------------------------------
-- 2. PROFESSORES — ativo/inativo
-- ------------------------------------------------------------
alter table public.profiles add column if not exists active boolean not null default true;

-- Admin pode gerenciar profiles de professores (ativar/desativar), além do próprio
drop policy if exists "profiles: self read/update" on public.profiles;
create policy "profiles: self or admin read/update" on public.profiles
  for all using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- Função para o Admin listar professores com contagem de alunos e e-mail (auth.users não é acessível direto do client)
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
  order by p.created_at asc;
$$;
revoke all on function public.list_professionals() from public;
grant execute on function public.list_professionals() to authenticated;

-- Função para o Admin criar um novo professor (não pode criar login/senha via SQL —
-- o professor precisa se cadastrar normalmente; esta função só marca o profile como admin
-- ou ativa/desativa, dado que o cadastro (auth.users) só pode ser feito pelo próprio usuário
-- ou por uma Service Role Key que não temos neste projeto)
create or replace function public.set_professional_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o status de professores';
  end if;
  update public.profiles set active = p_active where id = p_user_id;
end;
$$;
revoke all on function public.set_professional_active(uuid, boolean) from public;
grant execute on function public.set_professional_active(uuid, boolean) to authenticated;
