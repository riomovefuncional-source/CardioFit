# CardioFit

Plataforma de gestão e acompanhamento de alunos em treinamento físico, com foco em
populações com fatores de risco cardiovascular. MVP com autenticação, alunos, anamnese,
avaliações, treinos, sessões (com cálculo de carga), alertas de segurança configuráveis,
evolução e financeiro flexível por contrato individual — tudo persistido em Supabase.

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env` e preencha com os dados do seu projeto Supabase
   (Project Settings → API → Project URL / anon public key).
3. Aplique o schema: no painel do Supabase, vá em SQL Editor e rode o conteúdo de
   `supabase/migrations/0001_init.sql` (ou use `supabase db push` com a Supabase CLI
   se preferir versionar via CLI).
4. `npm run dev`

## Estrutura

- `supabase/migrations/` — schema do banco (tabelas, RLS, triggers). Toda tabela de
  evento (avaliações, sessões, pagamentos, histórico de anamnese) é insert-only:
  nada é sobrescrito, para preservar histórico real.
- `src/lib/supabaseClient.ts` — cliente Supabase configurado por variáveis de ambiente.
- `src/pages/` — telas: Login, Dashboard, Alunos, Perfil do aluno (abas: Geral, Saúde,
  Avaliações, Treinos, Sessões, Evolução, Financeiro, Alertas), Financeiro geral.
- `src/types/` — tipos TypeScript espelhando as tabelas do banco.

## Financeiro

O valor de cobrança é sempre o do contrato individual do aluno (`student_contracts.agreed_value`),
nunca um preço fixo no código. Alterar um plano padrão não afeta contratos já criados.

## Alertas clínicos

As regras ficam na tabela `clinical_safety_rules` (configuráveis, versionadas). O sistema
NÃO emite diagnóstico — os indicadores servem como apoio à decisão do profissional.

## Próximos passos sugeridos

- CRUD completo de exercícios dentro de cada treino (tabela `workout_exercises` já existe).
- Popular `clinical_safety_rules` com as regras iniciais (ex: SpO2 < 92 → vermelho).
- Tela de configurações (planos padrão, regras de alerta).
- Deploy (Vercel) + variáveis de ambiente de produção.
