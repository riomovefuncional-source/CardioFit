-- CardioFit — 0007: nível de treinamento do aluno (usado para ajustar periodização)
alter table public.students add column if not exists training_level text check (training_level in ('iniciante','intermediario','avancado')) default 'iniciante';
