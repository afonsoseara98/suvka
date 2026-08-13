import { randomBytes, createHash, timingSafeEqual } from "crypto";

// RECUPERAR A PALAVRA-PASSE SEM ABRIR UMA PORTA NOVA
//
// Sem isto, um dono de restaurante que se esqueça da password perde o acesso ao website do
// próprio negócio, para sempre — e a única saída era telefonar-nos, o que só funciona
// enquanto forem dez e os conhecermos a todos pelo nome.
//
// Mas uma recuperação de password é, por construção, uma forma de entrar numa conta sem
// saber a password dela. Tudo aqui existe para que essa forma seja mais estreita do que a
// porta da frente, e não mais larga.
//
// AS QUATRO DECISÕES, E O QUE CADA UMA IMPEDE
//
// 1. O QUE FICA GUARDADO É O RESUMO, NUNCA O CÓDIGO.
//    Uma cópia da base de dados que vaze é má. Uma cópia que traga códigos de recuperação
//    válidos é um kit de tomada de contas, pronto a usar, para todas as contas com um pedido
//    aberto. Guardamos SHA-256 do código; quem ler a tabela não consegue voltar atrás.
//
//    SHA-256 e não bcrypt de propósito, ao contrário das passwords: um código destes tem 256
//    bits de aleatoriedade e não se adivinha por dicionário. O bcrypt aqui só serviria para
//    tornar cada verificação lenta sem tornar nada mais seguro.
//
// 2. UMA HORA.
//    O tempo em que um código roubado — do email, do histórico do browser, de um portátil
//    aberto — ainda serve para alguma coisa. Uma hora chega para quem pediu; um dia chega
//    para quem passar pelo email dele a semana toda.
//
// 3. USA-SE UMA VEZ.
//    O link fica no email para sempre. Sem isto, quem tiver acesso ao email dele daqui a um
//    ano entra na conta com um link antigo.
//
// 4. A COMPARAÇÃO É EM TEMPO CONSTANTE.
//    Um `===` sobre resumos deixa medir, pelo tempo de resposta, quantos caracteres
//    acertaram. É um ataque teórico contra um valor de 256 bits, mas custa uma linha evitá-lo.

// 32 bytes. Não é um número escolhido por conforto: é o que torna adivinhar um código menos
// provável do que adivinhar a password diretamente, que é o ponto todo.
const TOKEN_BYTES = 32;

export const RESET_TTL_MS = 60 * 60 * 1000;

export interface IssuedToken {
  // Vai no email, e mais lado nenhum. Nunca é guardado, nunca é registado no journal.
  token: string;
  // O que fica na base de dados.
  tokenHash: string;
  expiresAt: Date;
}

export function issueResetToken(now: Date = new Date()): IssuedToken {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Tempo constante. Os dois resumos têm sempre o mesmo comprimento, portanto não há aqui o
// caso de tamanhos diferentes que obrigaria a decidir o que fazer com ele.
export function resetTokenMatches(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashResetToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export interface StoredToken {
  expiresAt: Date;
  usedAt: Date | null;
}

export type TokenVerdict = "valid" | "expired" | "used";

// Expirado e usado são distinguidos aqui e NÃO são distinguidos ao utilizador: os dois dizem
// "este link já não serve, peça outro". A diferença serve para nós percebermos, nos registos,
// se o prazo está demasiado curto — não para dar a quem tem um código velho a informação de
// que ele já foi bom.
export function verdictFor(stored: StoredToken, now: Date = new Date()): TokenVerdict {
  if (stored.usedAt !== null) return "used";
  if (stored.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

// A MENSAGEM É A MESMA, HAJA CONTA OU NÃO
//
// "Não existe conta com esse email" transforma este formulário num verificador de contas:
// escrevem-se mil endereços e sabe-se quais são clientes. E num produto onde o cliente é um
// restaurante com nome e morada públicos, saber que ele é cliente é o primeiro passo para o
// atacar por outro lado.
//
// Portanto a resposta é sempre esta, e o tempo de resposta também não deve denunciar nada.
export const SAME_ANSWER_ALWAYS =
  "Se existir uma conta com esse email, enviámos as instruções para lá. Verifique também o spam.";
