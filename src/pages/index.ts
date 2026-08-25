export type PageKey =
  | 'ano'
  | 'parametros'
  | 'pontuacao'
  | 'calendario'
  | 'bandeiras'
  | 'pilotos'
  | 'equipes'
  | 'times'
  | 'recordesCadastro'
  | 'provaAProva'
  | 'classificacaoGeral'
  | 'classificacaoPorProva'
  | 'recordes'
  | 'confronto'
  | 'dashboardPilotos'
  | 'dashboardEquipes';

export const PAGE_TITLES: Record<PageKey, string> = {
  ano: 'Ano do jogo',
  parametros: 'Parâmetros do ano',
  pontuacao: 'Pontuação',
  calendario: 'Calendário / Provas',
  bandeiras: 'Bandeiras',
  pilotos: 'Pilotos',
  equipes: 'Equipes',
  times: 'Times',
  recordesCadastro: 'Cadastro de Recordes',
  provaAProva: 'Prova a Prova',
  classificacaoGeral: 'Classificação Geral',
  classificacaoPorProva: 'Classificação Prova a Prova',
  recordes: 'Recordes',
  confronto: 'Cara a Cara',
  dashboardPilotos: 'Dashboard — Pilotos',
  dashboardEquipes: 'Dashboard — Equipes'
};
