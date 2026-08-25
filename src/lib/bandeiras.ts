import { f1, supabase } from './supabaseClient';
import type { TbBandeira } from './types';

// Catálogo de bandeiras gravado no banco (f1.tb_bandeira) + imagens no
// Supabase Storage (bucket "bandeiras") — ver supabase/migrations/0008_bandeiras.sql.
// Antes disso, o catálogo era uma lista fixa em código (flags.ts) e as imagens
// ficavam em public/flags/*.png: cadastrar uma bandeira nova exigia editar o
// código e fazer novo build/deploy. Agora tudo é feito pela tela "Bandeiras".

const BUCKET = 'bandeiras';

export async function carregarBandeiras(): Promise<TbBandeira[]> {
  const { data, error } = await f1().from('tb_bandeira').select('*').order('codigo');
  if (error) throw error;
  return (data as TbBandeira[]) ?? [];
}

// Monta um mapa código -> URL da imagem, pra uso direto em <img src>.
export function mapaPorCodigo(bandeiras: TbBandeira[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  bandeiras.forEach((b) => {
    mapa[b.codigo] = b.url_imagem;
  });
  return mapa;
}

export async function cadastrarBandeira(codigo: string, nome: string, arquivo: File): Promise<void> {
  const codigoNormalizado = codigo.trim().toUpperCase();
  const extensao = arquivo.name.split('.').pop() || 'png';
  // nome do arquivo com timestamp pra nunca colidir, mesmo se cadastrarem o
  // mesmo código de novo (ex.: trocar a imagem de uma bandeira existente)
  const caminho = `${codigoNormalizado}-${Date.now()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { data: urlPublica } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  const { error } = await f1()
    .from('tb_bandeira')
    .insert({ codigo: codigoNormalizado, nome: nome.trim(), url_imagem: urlPublica.publicUrl });
  if (error) throw error;
}

export async function atualizarBandeira(
  bandeira: TbBandeira,
  codigo: string,
  nome: string,
  novoArquivo: File | null
): Promise<void> {
  const codigoNormalizado = codigo.trim().toUpperCase();
  const payload: { codigo: string; nome: string; url_imagem?: string } = {
    codigo: codigoNormalizado,
    nome: nome.trim()
  };

  if (novoArquivo) {
    const extensao = novoArquivo.name.split('.').pop() || 'png';
    const caminho = `${codigoNormalizado}-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, novoArquivo);
    if (erroUpload) throw erroUpload;
    const { data: urlPublica } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
    payload.url_imagem = urlPublica.publicUrl;
  }

  const { error } = await f1().from('tb_bandeira').update(payload).eq('id', bandeira.id);
  if (error) throw error;

  // best-effort: se trocou a imagem, remove a antiga do Storage (idem
  // excluirBandeira — não falha se a antiga apontava pra public/flags/)
  if (novoArquivo) {
    const marcador = `/${BUCKET}/`;
    const indice = bandeira.url_imagem.indexOf(marcador);
    if (indice !== -1) {
      const caminhoAntigo = bandeira.url_imagem.slice(indice + marcador.length);
      await supabase.storage.from(BUCKET).remove([caminhoAntigo]);
    }
  }
}

export async function excluirBandeira(bandeira: TbBandeira): Promise<void> {
  const { error } = await f1().from('tb_bandeira').delete().eq('id', bandeira.id);
  if (error) throw error;

  // best-effort: remove o arquivo do Storage também, se ele estiver lá (as
  // bandeiras "de origem", seedadas da migration, apontam pra public/flags/
  // e não têm nada pra remover do bucket — por isso não falha se não achar).
  const marcador = `/${BUCKET}/`;
  const indice = bandeira.url_imagem.indexOf(marcador);
  if (indice === -1) return;
  const caminho = bandeira.url_imagem.slice(indice + marcador.length);
  await supabase.storage.from(BUCKET).remove([caminho]);
}
