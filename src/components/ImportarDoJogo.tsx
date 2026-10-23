import { useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import {
  carregarAlias,
  casarNomes,
  chaveNome,
  ehCorrida,
  ehQualificacao,
  formatarVolta,
  indiceMelhorVolta,
  resultadoTexto,
  rotuloSessao,
  salvarAlias,
  type SessaoJogo
} from '../lib/jogoUdp';

export type AplicacaoJogo = {
  corrida?: Record<number, number>; // idPiloto -> posição
  sprint?: Record<number, number>;
  poleId?: number | null; // null = não identificada (não mexe no formulário)
  voltaId?: number | null;
  avisos: string[];
};

type Props = {
  roster: { idPiloto: number; nomePiloto: string }[];
  provaSprint: boolean;
  onAplicar: (a: AplicacaoJogo) => void;
};

const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Painel "Importar do jogo": lê os rascunhos enviados pelo bridge (f1.tb_sessao_jogo)
// e SÓ preenche o formulário da Prova a Prova — nada é gravado em tb_resultado aqui.
export default function ImportarDoJogo({ roster, provaSprint, onAplicar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [sessoes, setSessoes] = useState<SessaoJogo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [selCorrida, setSelCorrida] = useState('');
  const [selSprint, setSelSprint] = useState('');
  const [selQuali, setSelQuali] = useState('');
  const [manual, setManual] = useState<Record<string, number>>({});

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro(null);
    const { data, error } = await f1().from('tb_sessao_jogo').select('*').order('created_at', { ascending: false }).limit(30);
    setCarregando(false);
    if (error) return setErro(error.message);
    const lista = (data as SessaoJogo[]) ?? [];
    setSessoes(lista);
    setSelCorrida(String(lista.find((s) => ehCorrida(s.session_type))?.id ?? ''));
    setSelQuali(String(lista.find((s) => s.session_type >= 7 && s.session_type <= 9)?.id ?? ''));
    setSelSprint('');
  }

  const alias = { ...carregarAlias(), ...manual };
  const achar = (id: string) => sessoes.find((s) => String(s.id) === id);
  const casar = (s?: SessaoJogo) => (s ? casarNomes(roster, s.payload.cars.map((c) => c.nome), alias) : new Map<number, number>());

  const corridaS = achar(selCorrida);
  const qualiS = achar(selQuali);
  const mCorrida = casar(corridaS);
  const mQuali = casar(qualiS);
  const ivVolta = corridaS ? indiceMelhorVolta(corridaS.payload.cars) : null;

  const rotulo = (s: SessaoJogo) =>
    `${rotuloSessao(s.session_type)} · ${hora(s.created_at)} · P1: ${s.payload.cars[0]?.nome ?? '?'}`;

  function aplicar() {
    const avisos: string[] = [];
    const out: AplicacaoJogo = { avisos };

    if (corridaS) {
      out.corrida = {};
      corridaS.payload.cars.forEach((c, k) => {
        const id = mCorrida.get(k);
        if (id) out.corrida![id] = c.pos;
      });
      const sem = corridaS.payload.cars.length - mCorrida.size;
      if (sem > 0) avisos.push(`${sem} carro(s) da corrida sem piloto associado.`);
      out.voltaId = ivVolta !== null ? mCorrida.get(ivVolta) ?? null : null;
      if (out.voltaId == null) avisos.push('Volta mais rápida não identificada.');
    }

    const sprintS = achar(selSprint);
    if (sprintS) {
      const m = casar(sprintS);
      out.sprint = {};
      sprintS.payload.cars.forEach((c, k) => {
        const id = m.get(k);
        if (id) out.sprint![id] = c.pos;
      });
      const sem = sprintS.payload.cars.length - m.size;
      if (sem > 0) avisos.push(`${sem} carro(s) da sprint sem piloto associado.`);
    }

    if (qualiS) {
      const k = qualiS.payload.cars.findIndex((c) => c.pos === 1);
      out.poleId = k >= 0 ? mQuali.get(k) ?? null : null;
      if (out.poleId == null) avisos.push('Pole não identificada.');
    } else {
      avisos.push('Sem qualificação selecionada: pole não alterada.');
    }

    salvarAlias(manual);
    onAplicar(out);
    setAberto(false);
  }

  const opcoes = (filtro: (s: SessaoJogo) => boolean, vazio?: string) => (
    <>
      <option value="">{vazio ?? 'Selecione...'}</option>
      {sessoes.filter(filtro).map((s) => (
        <option key={s.id} value={s.id}>{rotulo(s)}</option>
      ))}
    </>
  );

  if (!aberto) {
    return (
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn-ghost" onClick={abrir}>Importar do jogo</button>
      </div>
    );
  }

  return (
    <div className="form-card">
      <strong>Importar do jogo</strong>
      <p className="field-hint" style={{ margin: '4px 0 12px' }}>
        Preenche o formulário abaixo com a classificação enviada pelo jogo. Nada é gravado até você clicar em Salvar.
      </p>
      {erro && <div className="banner-error">{erro}</div>}
      {carregando && <div className="banner-info">Buscando sessões…</div>}
      {!carregando && !erro && sessoes.length === 0 && (
        <div className="banner-warn">Nenhuma sessão recebida ainda. Rode o bridge e termine uma sessão no jogo.</div>
      )}

      {sessoes.length > 0 && (
        <>
          <div className="form-grid">
            <div className="field" style={{ minWidth: 280 }}>
              <label>Corrida</label>
              <div className="select-wrap">
                <select value={selCorrida} onChange={(e) => setSelCorrida(e.target.value)}>
                  {opcoes((s) => ehCorrida(s.session_type), 'Não importar')}
                </select>
              </div>
            </div>
            {provaSprint && (
              <div className="field" style={{ minWidth: 280 }}>
                <label>Sprint</label>
                <div className="select-wrap">
                  <select value={selSprint} onChange={(e) => setSelSprint(e.target.value)}>
                    {opcoes((s) => ehCorrida(s.session_type), 'Não importar')}
                  </select>
                </div>
              </div>
            )}
            <div className="field" style={{ minWidth: 280 }}>
              <label>Qualificação (define a pole)</label>
              <div className="select-wrap">
                <select value={selQuali} onChange={(e) => setSelQuali(e.target.value)}>
                  {opcoes((s) => ehQualificacao(s.session_type), 'Não alterar a pole')}
                </select>
              </div>
            </div>
          </div>

          {corridaS && (
            <div className="table-card table-card--tight" style={{ marginTop: 14 }}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Pos</th><th>No jogo</th><th>Piloto no sistema</th><th>Status</th><th>Melhor volta</th></tr>
                  </thead>
                  <tbody>
                    {corridaS.payload.cars.map((c, k) => {
                      const id = mCorrida.get(k);
                      return (
                        <tr key={c.i}>
                          <td>{c.pos}{qualiS && mQuali.get(qualiS.payload.cars.findIndex((q) => q.pos === 1)) === id && id ? ' · pole' : ''}</td>
                          <td>{c.nome}</td>
                          <td>
                            {id ? (
                              roster.find((r) => r.idPiloto === id)?.nomePiloto
                            ) : (
                              <div className="select-wrap">
                                <select
                                  value=""
                                  onChange={(e) => e.target.value && setManual((m) => ({ ...m, [chaveNome(c.nome)]: Number(e.target.value) }))}
                                >
                                  <option value="">Associar piloto…</option>
                                  {roster.map((r) => <option key={r.idPiloto} value={r.idPiloto}>{r.nomePiloto}</option>)}
                                </select>
                              </div>
                            )}
                          </td>
                          <td>{resultadoTexto(c.resultado)}</td>
                          <td style={k === ivVolta ? { fontWeight: 800, color: '#b66dff' } : undefined}>{formatarVolta(c.melhorVoltaMs)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button type="button" className="btn-primary" onClick={aplicar} disabled={!corridaS && !achar(selSprint) && !qualiS}>
          Preencher formulário (não grava)
        </button>
        <button type="button" className="btn-ghost" onClick={() => setAberto(false)}>Fechar</button>
      </div>
    </div>
  );
}
