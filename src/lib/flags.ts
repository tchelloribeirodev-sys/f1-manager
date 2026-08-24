/**
 * Códigos de bandeira usados no Delphi (pasta Bandeiras/*.bmp), com o nome
 * do país/GP para exibição no combo. Usado tanto no calendário de provas
 * quanto na nacionalidade do piloto (bandeira ao lado da sigla no grid).
 *
 * As imagens originais são .bmp; para a web, o ideal é converter para
 * .svg/.png e servir de /public/flags/<codigo>.png (ver README).
 */
export const BANDEIRAS: { codigo: string; nome: string }[] = [
  { codigo: 'ABU', nome: 'Abu Dhabi' },
  { codigo: 'AUS', nome: 'Austrália' },
  { codigo: 'AUT', nome: 'Áustria' },
  { codigo: 'AZE', nome: 'Azerbaijão' },
  { codigo: 'BAH', nome: 'Bahrein' },
  { codigo: 'BEL', nome: 'Bélgica' },
  { codigo: 'BRA', nome: 'Brasil' },
  { codigo: 'CAN', nome: 'Canadá' },
  { codigo: 'CHI', nome: 'China' },
  { codigo: 'ESP', nome: 'Espanha' },
  { codigo: 'EUA', nome: 'Estados Unidos' },
  { codigo: 'FRA', nome: 'França' },
  { codigo: 'HOL', nome: 'Holanda' },
  { codigo: 'HUN', nome: 'Hungria' },
  { codigo: 'IMO', nome: 'Emilia Romagna (Imola)' },
  { codigo: 'ING', nome: 'Inglaterra' },
  { codigo: 'ITA', nome: 'Itália' },
  { codigo: 'JAP', nome: 'Japão' },
  { codigo: 'JID', nome: 'Arábia Saudita (Jidá)' },
  { codigo: 'MEX', nome: 'México' },
  { codigo: 'MIA', nome: 'Miami' },
  { codigo: 'MON', nome: 'Mônaco' },
  { codigo: 'POR', nome: 'Portugal' },
  { codigo: 'QAT', nome: 'Catar' },
  { codigo: 'RUS', nome: 'Rússia' },
  { codigo: 'SIN', nome: 'Singapura' },
  { codigo: 'VEG', nome: 'Las Vegas' }
];
