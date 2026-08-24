// Extrai o sobrenome de um nome completo pra exibir em lugares compactos
// (combos, tabelas estreitas). Tira só a primeira palavra em vez de pegar
// "a última palavra" — assim nomes com partícula como "Nyck de Vries"
// viram "de Vries" e não só "Vries".
export function sobrenome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length <= 1) return nomeCompleto;
  return partes.slice(1).join(' ');
}

// Sobrenomes curtos pra uma lista de pilotos, desambiguando automaticamente
// quando dois do MESMO elenco compartilham sobrenome (ex.: dois "Leclerc")
// — nesse caso, só esses ganham a inicial do primeiro nome ("A. Leclerc",
// "C. Leclerc"). O nome completo gravado no banco continua limpo; isso é
// só uma questão de exibição.
export function sobrenomesComDesambiguacao<T>(pilotos: T[], nomeCompletoDe: (p: T) => string): Map<T, string> {
  const grupos = new Map<string, T[]>();
  pilotos.forEach((p) => {
    const s = sobrenome(nomeCompletoDe(p));
    grupos.set(s, [...(grupos.get(s) ?? []), p]);
  });

  const resultado = new Map<T, string>();
  grupos.forEach((lista, s) => {
    lista.forEach((p) => {
      if (lista.length === 1) {
        resultado.set(p, s);
      } else {
        const inicial = nomeCompletoDe(p).trim().charAt(0).toUpperCase();
        resultado.set(p, `${inicial}. ${s}`);
      }
    });
  });
  return resultado;
}
