import { useEffect, useRef, useState } from 'react';
import { atualizarBandeira, cadastrarBandeira, carregarBandeiras, excluirBandeira } from '../lib/bandeiras';
import type { TbBandeira } from '../lib/types';

export default function BandeirasPage() {
  const [bandeiras, setBandeiras] = useState<TbBandeira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<TbBandeira | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setCarregando(true);
    try {
      setBandeiras(await carregarBandeiras());
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(b: TbBandeira) {
    setEditando(b);
    setCodigo(b.codigo);
    setNome(b.nome);
    setArquivo(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
    setErro(null);
    codigoRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditando(null);
    setCodigo('');
    setNome('');
    setArquivo(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
    setErro(null);
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!codigo.trim()) return setErro('Informe o código da bandeira (ex.: BRA).');
    if (!nome.trim()) return setErro('Informe o nome do país/GP.');
    if (!editando && !arquivo) return setErro('Selecione a imagem da bandeira.');
    const codigoNormalizado = codigo.trim().toUpperCase();
    const duplicada = bandeiras.some((b) => b.codigo === codigoNormalizado && b.id !== editando?.id);
    if (duplicada) {
      return setErro('Já existe uma bandeira com esse código — exclua a antiga antes de recadastrar.');
    }

    setSalvando(true);
    try {
      if (editando) {
        await atualizarBandeira(editando, codigo, nome, arquivo);
      } else {
        await cadastrarBandeira(codigo, nome, arquivo as File);
      }
      cancelarEdicao();
      await carregar();
      codigoRef.current?.focus();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(b: TbBandeira) {
    setErro(null);
    try {
      await excluirBandeira(b);
      if (editando?.id === b.id) cancelarEdicao();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      <form className="form-card form-grid" onSubmit={gravar}>
        <div className="field">
          <label>Código</label>
          <input
            ref={codigoRef}
            type="text"
            maxLength={5}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="ex.: BRA"
            style={{ width: 90, textTransform: 'uppercase' }}
          />
        </div>
        <div className="field">
          <label>Nome do país/GP</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex.: Brasil"
          />
        </div>
        <div className="field">
          <label>{editando ? 'Imagem (opcional, só se for trocar)' : 'Imagem (PNG)'}</label>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
          <span className="field-hint">*imagens de 16×9px </span>
        </div>
        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? 'Enviando...' : editando ? 'Salvar alteração' : 'Adicionar bandeira'}
        </button>
        {editando && (
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
                <th>Bandeira</th>
                <th>Código</th>
                <th>Nome</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bandeiras.map((b) => (
                <tr key={b.id} className={editando?.id === b.id ? 'row-editing' : undefined}>
                  <td>
                    <span className="flag-chip">
                      <img src={b.url_imagem} alt={b.codigo} />
                    </span>
                  </td>
                  <td>{b.codigo}</td>
                  <td>{b.nome}</td>
                  <td className="row-actions">
                    <button className="link-edit" onClick={() => alterar(b)}>
                      alterar
                    </button>
                    <button className="link-danger" onClick={() => excluir(b)}>
                      excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!carregando && bandeiras.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={4}>Nenhuma bandeira cadastrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
