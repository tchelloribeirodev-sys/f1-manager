export type TipoCarreira = 'PILOTO' | 'EQUIPE';

export interface TbAno {
  id: number;
  ano: number;
}

export interface TbTotais {
  id: number;
  ano_jogo: number;
  equipes: number;
  provas: number;
  pilotos: number;
  ponto_volta: boolean;
}

export interface TbPontuacao {
  id: number;
  ano_jogo: number;
  posicao: number;
  pontos: number;
}

export interface TbProva {
  id: number;
  ano_jogo: number;
  ordem: number;
  nome_prova: string;
  abreviacao_prova: string;
  sprint: boolean;
  bandeira: string | null;
}

export interface TbPiloto {
  id: number;
  ano_jogo: number;
  nome_piloto: string;
  abreviacao_piloto: string;
  aposentado: boolean;
  tipo_carreira: TipoCarreira;
  pais: string | null;
}

export interface TbEquipe {
  id: number;
  ano_jogo: number;
  nome_equipe: string;
  cor_equipe: string;
  tipo_carreira: TipoCarreira;
}

export interface TbTime {
  id: number;
  ano_jogo: number;
  temporada: number;
  id_equipe: number;
  id_piloto: number;
  status_piloto: 1 | 2;
  tipo_carreira: TipoCarreira;
  // colunas trazidas via join, apenas para exibição
  nome_equipe?: string;
  nome_piloto?: string;
}

export interface TbResultado {
  id: number;
  ano_jogo: number;
  temporada: number;
  id_prova: number;
  id_piloto: number;
  tipo_carreira: TipoCarreira;
  posicao: number | null;
  pole: boolean;
  volta_mais_rapida: boolean;
}

export interface TbResultadoSprint {
  id: number;
  ano_jogo: number;
  temporada: number;
  id_prova: number;
  id_piloto: number;
  tipo_carreira: TipoCarreira;
  posicao: number | null;
}

export interface TbRecorde {
  id: number;
  ano_jogo: number; // 2000 = valor fixo de piloto aposentado (mesma convenção de tb_piloto)
  tipo_carreira: TipoCarreira;
  id_piloto: number;
  vitorias: number;
  poles: number;
  voltas_mais_rapidas: number;
  podios: number;
  // colunas trazidas via join, apenas para exibição
  nome_piloto?: string;
  aposentado?: boolean;
}

export const ANO_APOSENTADO = 2000; // convenção herdada do sistema Delphi
