import { describe, it, expect } from "vitest";
import { nextActionFor, remainingActions, type SiteState } from "./nextAction";

function site(o: Partial<SiteState> = {}): SiteState {
  return {
    fotografias: 6,
    temWhatsapp: true,
    temReservas: true,
    temGoogle: true,
    temDescricao: true,
    horarioLegivel: true,
    temRazao: true,
    temEntregas: false,
    temLinksDeEntrega: false,
    ...o,
  };
}

// UMA ACÇÃO, NÃO UMA LISTA
//
// O dono está numa cozinha e tem quatro minutos. Uma lista de dez melhorias é uma lista que
// não se faz; um painel que lhe apresenta um plano de trabalho é um painel que ele fecha.
describe("uma de cada vez, e a que mais lhe muda a vida", () => {
  it("um site completo não recebe tarefa nenhuma", () => {
    expect(nextActionFor(site())).toBeNull();
    expect(remainingActions(site())).toBe(0);
  });

  // A pergunta "está aberto agora?" é a mais frequente numa página de restaurante, e é a
  // única desta lista em que o site está neste momento a calar-se sobre algo que sabe.
  it("o horário ilegível ganha a tudo o resto", () => {
    const tudoEmFalta = site({
      horarioLegivel: false,
      fotografias: 0,
      temWhatsapp: false,
      temGoogle: false,
      temRazao: false,
      temDescricao: false,
    });
    expect(nextActionFor(tudoEmFalta)?.campo).toBe("schedule");
  });

  it("saber porque é que o escolhem vem antes de fotografias e de canais", () => {
    const semRazao = site({ temRazao: false, temDescricao: false, fotografias: 0, temWhatsapp: false });
    expect(nextActionFor(semRazao)?.campo).toBe("description");
  });

  // As fotografias são a única coisa da lista que muda a página inteira, e a única que
  // ninguém lhe pode copiar.
  it("as fotografias vêm antes dos canais", () => {
    expect(nextActionFor(site({ fotografias: 1, temWhatsapp: false, temGoogle: false }))?.campo).toBe("photos");
  });

  it("e a seguinte só aparece quando a primeira está feita", () => {
    const antes = site({ fotografias: 0, temWhatsapp: false });
    expect(nextActionFor(antes)?.campo).toBe("photos");
    expect(nextActionFor({ ...antes, fotografias: 5 })?.campo).toBe("whatsapp");
  });

  // Anunciar entregas sem dizer onde é pior do que não as anunciar: quem quer encomendar vai
  // procurar a outro lado, e muitas vezes encontra outro restaurante pelo caminho.
  it("prometer entregas sem dizer por onde é uma falha, não fazer entregas não é", () => {
    expect(nextActionFor(site({ temEntregas: true, temLinksDeEntrega: false }))?.campo).toBe("uberEats");
    expect(nextActionFor(site({ temEntregas: false, temLinksDeEntrega: false }))).toBeNull();
  });
});

// PORQUE É QUE NÃO HÁ AQUI UM "IMPACTO ESTIMADO"
//
// O desenho pedido incluía "+18% reservas" ao lado de cada recomendação. Não temos nenhum
// número desses: zero restaurantes publicados com tráfego medido. Uma percentagem inventada
// tem a autoridade de uma medição, e um dono que faz o que lhe dissemos e não vê o resultado
// prometido não volta a acreditar em mais nada que este painel diga.
describe("nada aqui finge ser uma medição", () => {
  it("nenhuma recomendação promete uma percentagem", () => {
    const estados: SiteState[] = [
      site({ horarioLegivel: false }),
      site({ temRazao: false, temDescricao: false }),
      site({ fotografias: 0 }),
      site({ temWhatsapp: false }),
      site({ temGoogle: false }),
      site({ temEntregas: true }),
      site({ temReservas: false }),
    ];

    for (const estado of estados) {
      const accao = nextActionFor(estado)!;
      expect(accao.porque, accao.titulo).not.toMatch(/\d+\s*%|\+\d/);
    }
  });

  // Um conselho sem destino é um conselho que ele lê e não faz.
  it("toda a acção diz onde se resolve", () => {
    for (const estado of [site({ fotografias: 0 }), site({ temWhatsapp: false }), site({ temGoogle: false })]) {
      const accao = nextActionFor(estado)!;
      expect(accao.campo.length).toBeGreaterThan(0);
      expect(accao.titulo.length).toBeLessThan(60);
    }
  });
});

// UMA CONTRADIÇÃO VALE MAIS DO QUE UM CAMPO EM FALTA
//
// Que lhe falta o WhatsApp, ele sabe - é um campo vazio que ele viu quando preencheu. Que o
// site que lhe fizemos parece caro e a casa dele é barata, não sabe.
describe("o que ele não consegue ver sozinho vem primeiro", () => {
  const contradicao = {
    eixo: "estiloAcimaDoPreco",
    viu: 'Escolheu o estilo "Elegante" e os pratos estão a 9 €.',
    custa: "O site vai parecer mais caro do que a casa é.",
    decide: "O estilo está mal escolhido, ou os preços estão desactualizados?",
    gravidade: 0.9,
  };

  it("ganha a um campo em falta", () => {
    const accao = nextActionFor(site({ temWhatsapp: false, fotografias: 0 }), [contradicao]);
    expect(accao?.campo).toBe("estiloAcimaDoPreco");
    expect(accao?.titulo).toMatch(/\?$/);
  });

  // O único caso em que a página está NESTE MOMENTO a calar-se sobre uma coisa que sabe.
  it("mas não ganha ao horário que não conseguimos ler", () => {
    expect(nextActionFor(site({ horarioLegivel: false }), [contradicao])?.campo).toBe("schedule");
  });

  it("uma contradição leve não interrompe o trabalho normal", () => {
    const leve = { ...contradicao, gravidade: 0.5 };
    expect(nextActionFor(site({ temWhatsapp: false }), [leve])?.campo).toBe("whatsapp");
  });

  it("um site completo com uma contradição continua a ter o que dizer", () => {
    expect(nextActionFor(site(), [])).toBeNull();
    expect(nextActionFor(site(), [contradicao])?.campo).toBe("estiloAcimaDoPreco");
  });
});
