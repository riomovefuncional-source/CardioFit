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

export type RecoveryCheckin = {
  id: string
  student_id: string
  checkin_at: string
  systolic_bp: number | null
  diastolic_bp: number | null
  heart_rate: number | null
  spo2: number | null
  sleep_quality: number | null
  energy_level: number | null
  pain_level: number | null
  fatigue_level: number | null
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
