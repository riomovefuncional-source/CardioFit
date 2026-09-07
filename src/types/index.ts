export type Student = {
  id: string
  owner_id: string
  full_name: string
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  occupation: string | null
  notes: string | null
  status: 'ativo' | 'inativo' | 'pausado'
  entry_date: string
  user_id: string | null
  created_at: string
  updated_at: string
}

export type HealthHistory = {
  id: string
  student_id: string
  cardiovascular_diagnosis: string | null
  history_infarction: boolean
  heart_failure: boolean
  hypertension: boolean
  arrhythmia: boolean
  coronary_artery_disease: boolean
  family_history: string | null
  cardiovascular_procedures: string | null
  surgeries: string | null
  symptoms: string[] | null
  risk_factors: string[] | null
  musculoskeletal_notes: string | null
  medical_followup: string | null
  affected_regions: string[] | null
  surgeries_history: string | null
  hospitalizations: string | null
  prior_illnesses: string | null
  respiratory_diseases: string | null
  created_at: string
}

export type CardiacDiagnosis = {
  id: string
  student_id: string
  diagnosis: string
  diagnosis_date: string | null
  history: string | null
  severity: string | null
  treatment: string | null
  notes: string | null
  created_at: string
}

export type SymptomRecord = {
  id: string
  student_id: string
  symptom: string
  present: boolean
  frequency: string | null
  intensity: string | null
  situation: string | null
  notes: string | null
  created_at: string
}

export type PainRecord = {
  id: string
  student_id: string
  location: string | null
  side: string | null
  intensity: number | null
  pain_type: string | null
  onset: string | null
  duration: string | null
  frequency: string | null
  worsens_with: string | null
  improves_with: string | null
  pain_during_exercise: boolean | null
  pain_after_exercise: boolean | null
  notes: string | null
  created_at: string
}

export type Habits = {
  id: string
  student_id: string
  activity_level: string | null
  weekly_frequency: string | null
  activity_type: string | null
  smoking: string | null
  alcohol: string | null
  sleep_quality: string | null
  stress_level: string | null
  diet: string | null
  hydration: string | null
  daily_routine: string | null
  work: string | null
  training_preference: string | null
  preferred_environment: string | null
  preferred_time: string | null
  equipment_preference: string | null
  effort_tolerance: string | null
  notes: string | null
  created_at: string
}

export type Attendance = {
  id: string
  student_id: string
  attendance_date: string
  status: 'presente' | 'ausente' | 'cancelado' | 'reposicao'
  workout_session_id: string | null
  recorded_by: string
  origin: 'profissional' | 'aluno'
  notes: string | null
  created_at: string
}

export type FunctionalTestResult = {
  id: string
  student_id: string
  test_type: string
  test_date: string
  primary_result: number | null
  primary_unit: string | null
  parameters: Record<string, any>
  notes: string | null
  created_at: string
}

export type Medication = {
  id: string
  student_id: string
  name: string
  active_ingredient: string | null
  drug_class: string | null
  dose: string | null
  frequency: string | null
  schedule_time: string | null
  purpose: string | null
  notes: string | null
  start_date: string | null
  end_date: string | null
  active: boolean
}

export type Assessment = {
  id: string
  student_id: string
  assessment_date: string
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
  vo2_estimated: number | null
  notes: string | null
}

export type WorkoutPlan = {
  id: string
  student_id: string
  name: string
  objective: string | null
  phase: string | null
  frequency_per_week: number | null
  active: boolean
}

export type WorkoutExercise = {
  id: string
  workout_plan_id: string
  exercise_name: string
  muscle_group: string | null
  sets: number | null
  reps: string | null
  load_kg: number | null
  rest_seconds: number | null
  target_rpe: number | null
  order_index: number
  notes: string | null
}

export const PAIN_REGIONS = [
  'Joelho',
  'Quadril',
  'Lombar',
  'Ombro',
  'Punho',
  'Cotovelo',
  'Tornozelo',
  'Pescoço',
] as const

export type RecoveryCheckin = {
  id: string
  student_id: string
  checkin_at: string
  systolic_bp: number | null
  diastolic_bp: number | null
  heart_rate: number | null
  spo2: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  energy_level: number | null
  disposition: number | null
  stress_level: number | null
  pain_level: number | null
  pain_regions: string[] | null
  fatigue_level: number | null
  vo2_initial: number | null
  double_product_pre: number | null
  symptoms: string[] | null
  notes: string | null
}

export type WorkoutSession = {
  id: string
  student_id: string
  workout_plan_id: string | null
  session_date: string
  duration_minutes: number | null
  rpe: number | null
  session_load: number | null
  heart_rate_pre: number | null
  heart_rate_post: number | null
  heart_rate_max: number | null
  systolic_bp_pre: number | null
  systolic_bp_post: number | null
  diastolic_bp_pre: number | null
  diastolic_bp_post: number | null
  spo2_pre: number | null
  spo2_post: number | null
  double_product_pre: number | null
  double_product_post: number | null
  vo2_initial: number | null
  vo2_final: number | null
  feedback: string | null
  recovery_perception: number | null
  symptoms: string[] | null
  notes: string | null
}

export type Alert = {
  id: string
  student_id: string
  source_table: string
  source_id: string
  level: 'amarelo' | 'vermelho'
  message: string
  resolved: boolean
  created_at: string
}

export type Plan = {
  id: string
  name: string
  default_price: number
  default_periodicity: string
  active: boolean
}

export type StudentContract = {
  id: string
  student_id: string
  plan_id: string | null
  agreed_value: number
  periodicity: string
  due_day: number | null
  status: 'ativo' | 'pausado' | 'cancelado' | 'encerrado' | 'cortesia'
  start_date: string
  end_date: string | null
  notes: string | null
}

export type Payment = {
  id: string
  contract_id: string
  student_id: string
  amount: number
  due_date: string
  paid_date: string | null
  method: string | null
  status: 'pago' | 'pendente' | 'atrasado' | 'parcial' | 'cancelado'
  notes: string | null
}

export type CardioTest = {
  id: string
  student_id: string
  test_date: string
  protocol: string | null
  total_time_minutes: number | null
  borg_max: number | null
  hr_rest: number | null
  hr_peak: number | null
  sbp_rest: number | null
  sbp_peak: number | null
  met_max: number | null
  vo2_peak: number | null
  hr_ischemia: number | null
  hr_angina: number | null
  hr_arrhythmia: number | null
  hr_limitation: number | null
  stop_reason: string | null
}
