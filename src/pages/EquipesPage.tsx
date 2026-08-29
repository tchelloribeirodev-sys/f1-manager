import { useEffect, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { enviarImagemEquipe, removerImagemEquipe } from '../lib/equipeImagem';
import type { TbEquipe } from '../lib/types';

export default function EquipesPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [equipes, setEquipes] = useState<TbEquipe[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#FF8000');
  const [imagemAtualUrl, setImagemAtualUrl] = useState<string | null>(null);
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    if (!anoJogo) return setEquipes([]);
    const { data } = await f1()
      .from('tb_equipe')
      .select('*')
      .eq('ano_jogo', anoJogo)
      .eq('tipo_carreira', tipoCarreira)
      .order('id');
    setEquipes((data as TbEquipe[]) ?? []);
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira]);

  function editar(eq: TbEquipe) {
    setEditandoId(eq.id);
    setNome(eq.nome_equipe);
    setCor(eq.cor_equipe);
    setImagemAtualUrl(eq.imagem_url);
    setArquivoImagem(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
    setErro(null);
    nomeRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome('');
    setCor('#FF8000');
    setImagemAtualUrl(null);
    setArquivoImagem(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo) return;
    if (!nome.trim()) return setErro('Informe o nome da equipe.');

    setSalvando(true);
    setErro(null);
    try {
      let imagem_url = imagemAtualUrl;
      if (arquivoImagem) {
        imagem_url = await enviarImagemEquipe(arquivoImagem);
      }

      const payload = {
        ano_jogo: anoJogo,
        nome_equipe: nome.trim(),
        cor_equipe: cor,
        tipo_carreira: tipoCarreira,
        imagem_url
      };

      const { error } = editandoId
        ? await f1().from('tb_equipe').update(payload).eq('id', editandoId)
        : await f1().from('tb_equipe').insert(payload);
      if (error) throw error;

      // best-effort: se trocou a imagem, remove a antiga do Storage
      if (arquivoImagem && imagemAtualUrl) {
        await removerImagemEquipe(imagemAtualUrl);
      }

      cancelarEdicao();
      await carregar();
      nomeRef.current?.focus();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(eq: TbEquipe) {
    const { error } = await f1().from('tb_equipe').delete().eq('id', eq.id);
    if (error) return setErro(error.message);
    if (eq.imagem_url) await removerImagemEquipe(eq.imagem_url);
    if (editandoId === eq.id) cancelarEdicao();
    await carregar();
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <>
          <form className="form-card form-grid" onSubmit={gravar}>
            <div className="field">
              <label>Nome da equipe</label>
              <input
                ref={nomeRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: McLaren"
              />
            </div>
            <div className="field">
              <label>Cor</label>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <div className="field">
              <label>Imagem da equipe (opcional)</label>
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                onChange={(e) => setArquivoImagem(e.target.files?.[0] ?? null)}
              />
              {imagemAtualUrl && !arquivoImagem && (
                <span className="field-hint">já tem imagem cadastrada — escolha um arquivo só se for trocar</span>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Atualizar equipe' : 'Gravar equipe'}
            </button>
            {editandoId && (
              <button type="button" className="btn-ghost" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </form>

          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cor</th>
                    <th>Imagem</th>
                    <th>Equipe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {equipes.map((eq) => (
                    <tr key={eq.id} className={editandoId === eq.id ? 'row-editing' : undefined}>
                      <td>
                        <span className="color-dot" style={{ background: eq.cor_equipe }} title={eq.cor_equipe} />
                      </td>
                      <td>
                        {eq.imagem_url ? (
                          <span className="team-logo">
                            <img src={eq.imagem_url} alt={eq.nome_equipe} />
                          </span>
                        ) : (
                          <span className="field-hint">sem imagem</span>
                        )}
                      </td>
                      <td>{eq.nome_equipe}</td>
                      <td className="row-actions">
                        <button className="link-edit" onClick={() => editar(eq)}>
                          alterar
                        </button>
                        <button className="link-danger" onClick={() => excluir(eq)}>
                          excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {equipes.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={4}>Nenhuma equipe cadastrada para este ano/carreira.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
