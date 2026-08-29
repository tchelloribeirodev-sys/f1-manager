import { supabase } from './supabaseClient';

// Upload da imagem da equipe pro Supabase Storage (bucket "equipes", ver
// supabase/migrations/0009_imagem_equipe.sql). Mesmo padrão de src/lib/bandeiras.ts,
// mas aqui a imagem é uma coluna direta em tb_equipe (cada equipe tem a sua),
// não um catálogo compartilhado.

const BUCKET = 'equipes';

export async function enviarImagemEquipe(arquivo: File): Promise<string> {
  const extensao = arquivo.name.split('.').pop() || 'png';
  // nome com timestamp pra nunca colidir, mesmo trocando a imagem várias vezes
  const caminho = `equipe-${Date.now()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

// best-effort: não lança erro se a URL não apontar pro bucket (ex.: imagem
// antiga hospedada em outro lugar) — mesma lógica de excluirBandeira.
export async function removerImagemEquipe(url: string): Promise<void> {
  const marcador = `/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  if (indice === -1) return;
  const caminho = url.slice(indice + marcador.length);
  await supabase.storage.from(BUCKET).remove([caminho]);
}
