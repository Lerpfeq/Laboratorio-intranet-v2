-- Migração manual: adicionar campo Número CAS aos reagentes
--
-- Este projeto aplica o schema com `npx prisma db push` (não usa a pasta
-- prisma/migrations). Ao rodar `prisma db push` o Prisma criará a coluna
-- automaticamente a partir do schema.prisma. Este arquivo documenta a
-- alteração equivalente em SQL, caso seja necessário aplicá-la manualmente.

-- Adiciona a coluna cas_number na tabela de reagentes.
-- DEFAULT '' garante que linhas já existentes recebam um valor válido
-- (o campo é obrigatório na aplicação, preenchido pelo usuário no cadastro).
ALTER TABLE "Reagente"
  ADD COLUMN IF NOT EXISTS "cas_number" TEXT NOT NULL DEFAULT '';

-- Índice para acelerar a busca de reagentes por número CAS.
CREATE INDEX IF NOT EXISTS "Reagente_cas_number_idx"
  ON "Reagente" ("cas_number");
