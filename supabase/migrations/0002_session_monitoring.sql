-- CardioFit — 0002: monitoramento completo de pré-treino, sessão e pós-treino
-- Incremental: só adiciona colunas, não altera nada existente.

-- ---- Pré-treino (recovery_checkins) ----
alter table public.recovery_checkins
  add column if not exists sleep_hours numeric,
  add column if not exists disposition smallint check (disposition between 1 and 5),
  add column if not exists stress_level smallint check (stress_level between 1 and 5),
  add column if not exists pain_regions text[] default '{}',
  add column if not exists vo2_initial numeric,
  add column if not exists double_product_pre numeric generated always as (heart_rate * systolic_bp) stored;

comment on column public.recovery_checkins.sleep_quality is 'Qualidade do sono (1-5)';
comment on column public.recovery_checkins.energy_level is 'Nível de energia (1-5)';
comment on column public.recovery_checkins.pain_level is 'Intensidade da dor (0-10)';

-- ---- Sessão + pós-treino (workout_sessions) ----
alter table public.workout_sessions
  add column if not exists heart_rate_pre integer,
  add column if not exists heart_rate_post integer,
  add column if not exists heart_rate_max integer,
  add column if not exists systolic_bp_pre integer,
  add column if not exists systolic_bp_post integer,
  add column if not exists diastolic_bp_pre integer,
  add column if not exists diastolic_bp_post integer,
  add column if not exists spo2_pre integer,
  add column if not exists spo2_post integer,
  add column if not exists vo2_initial numeric,
  add column if not exists vo2_final numeric,
  add column if not exists feedback text,
  add column if not exists recovery_perception smallint check (recovery_perception between 1 and 5),
  add column if not exists double_product_pre numeric generated always as (heart_rate_pre * systolic_bp_pre) stored,
  add column if not exists double_product_post numeric generated always as (heart_rate_post * systolic_bp_post) stored;

-- PSE (rpe) sempre em escala 0-10 a partir de agora
alter table public.workout_sessions drop constraint if exists workout_sessions_rpe_check;
alter table public.workout_sessions add constraint workout_sessions_rpe_check check (rpe is null or (rpe >= 0 and rpe <= 10));
