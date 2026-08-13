import { describe, it, expect } from "vitest";
import { createMailer } from "./mailer";

// SEM CHAVE CONFIGURADA, O PRODUTO NÃO FINGE
//
// A alternativa - engolir a ausência e responder "enviámos" - deixava um dono de restaurante
// à espera de um email que nunca foi escrito, a desconfiar do produto em vez de nos ligar.
describe("createMailer", () => {
  it("em produção sem chave, admite que não consegue enviar", () => {
    expect(createMailer({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("em produção com metade da configuração, também não finge", () => {
    // Uma chave sem remetente, ou um remetente sem chave, é configuração a meio - e metade
    // da configuração de envio é o mesmo que nenhuma.
    expect(createMailer({ NODE_ENV: "production", RESEND_API_KEY: "re_x" } as NodeJS.ProcessEnv)).toBeNull();
    expect(createMailer({ NODE_ENV: "production", MAIL_FROM: "ola@suvka.com" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("com os dois, devolve um mailer", () => {
    const mailer = createMailer({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_x",
      MAIL_FROM: "ola@suvka.com",
    } as NodeJS.ProcessEnv);
    expect(mailer).not.toBeNull();
  });

  // Fora de produção escreve na consola, para quem trabalha no fluxo poder ver o link. É a
  // razão pela qual isto SÓ existe fora de produção.
  it("em desenvolvimento não bloqueia quem está a trabalhar", () => {
    expect(createMailer({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).not.toBeNull();
  });
});
