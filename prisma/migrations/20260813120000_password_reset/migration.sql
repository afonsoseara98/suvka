-- Um pedido de recuperação de password.
--
-- A chave primária é o RESUMO do código, não o código. Uma cópia desta tabela que vaze não
-- dá para entrar em conta nenhuma: quem a ler tem SHA-256 e não consegue voltar atrás. Ver
-- app/lib/passwordReset.ts, que explica cada uma das quatro decisões.
--
-- Tabela própria e não a VerificationToken do next-auth: aquela é da biblioteca, com o
-- formato dela, e partilhá-la significava que uma actualização podia mexer nas nossas linhas.
CREATE TABLE "PasswordResetToken" (
    "tokenHash" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    -- Uma vez, e só uma. O link fica no email para sempre.
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("tokenHash")
);

-- Para invalidar todos os pedidos de um utilizador quando um deles é usado.
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
-- Para a limpeza dos expirados.
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- Uma conta apagada não deixa para trás uma forma de lhe voltar a entrar.
ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
