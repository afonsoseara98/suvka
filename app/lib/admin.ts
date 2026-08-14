// QUEM PODE GASTAR O NOSSO DINHEIRO
//
// As quatro rotas de /api/benchmark verificavam que existia sessão e não verificavam QUEM era.
// O registo é aberto, portanto qualquer pessoa que criasse uma conta podia disparar gerações
// que fazem chamadas pagas a modelos.
//
// Não é um risco teórico: é a definição de uma conta que se cria para gastar o dinheiro de
// outra pessoa, e não deixa rasto nenhum que a distinga de uso legítimo.
//
// UMA LISTA E NÃO UM CAMPO NA BASE DE DADOS
//
// Um campo `isAdmin` no User seria a solução óbvia e é pior aqui: passa a ser possível
// conceder privilégios por escrita na base de dados, que é exactamente o que não se quer para
// uma porta que autoriza despesa. Uma variável de ambiente só muda com acesso ao servidor e
// com um reinício, e isso é uma propriedade e não uma limitação.
//
// Vazia por omissão. Um ambiente sem a lista configurada não tem administradores nenhuns - e
// falha fechado, que é o único lado seguro para errar numa verificação de autorização.

// Só a chave que interessa, e não NodeJS.ProcessEnv: o tipo do Node exige NODE_ENV e
// obrigaria cada teste a montar um ambiente inteiro para verificar uma lista de emails.
type Ambiente = { ADMIN_EMAILS?: string | undefined };

function listaDeAdmins(env: Ambiente = process.env as Ambiente): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

// Minúsculas dos dois lados: um endereço escrito com maiúsculas na configuração e em
// minúsculas na sessão é a mesma pessoa, e descobrir isso a meio de um incidente é tempo
// perdido por uma razão idiota.
export function isAdmin(email: string | null | undefined, env: Ambiente = process.env as Ambiente): boolean {
  if (!email) return false;
  return listaDeAdmins(env).has(email.trim().toLowerCase());
}
