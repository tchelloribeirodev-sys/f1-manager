import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (veja .env.local.example).'
  );
}

/**
 * Cliente Supabase para uso no browser. Como este é um app 100% client-side
 * (Vite/SPA, sem backend), ele usa a ANON KEY — nunca a service role key.
 * O acesso real é controlado por Supabase Auth (login em AuthGate.tsx) +
 * RLS exigindo role "authenticated" (ver supabase/migrations/0005_auth.sql).
 * persistSession precisa ser true para o usuário continuar logado entre
 * recarregamentos de página (a sessão fica salva no localStorage do navegador).
 */
export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true }
});

export function f1() {
  return supabase.schema('f1');
}

/**
 * O PostgREST (API do Supabase) limita cada resposta a um número máximo de
 * linhas (por padrão 1000) mesmo sem `.limit()` explícito — se a tabela tiver
 * mais linhas que isso, o resto fica de fora EM SILÊNCIO (sem erro nenhum).
 * Foi exatamente esse tipo de corte silencioso que já pegou a importação do
 * Jolpica-F1 (ver jolpica.ts). Pra consultas que podem crescer bastante
 * (ex.: tb_resultado somando temporadas inteiras), usar isto em vez de
 * `await query` direto garante que TODAS as linhas voltam, buscando em
 * páginas de `pageSize` até a página vir mais curta que o pedido.
 */
export async function buscarTudoPaginado<T>(
  construirPagina: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const todos: T[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await construirPagina(from, to);
    if (error) throw error;
    const pagina = data ?? [];
    todos.push(...pagina);
    if (pagina.length < pageSize) break;
    from += pageSize;
  }
  return todos;
}
