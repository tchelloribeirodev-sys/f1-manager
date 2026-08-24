import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import BrandMark from './BrandMark';

/**
 * Login real via Supabase Auth (e-mail + senha), substituindo a antiga
 * cortina de senha (VITE_APP_PASSWORD/Gate.tsx). Agora ler ou gravar
 * qualquer dado exige um usuário autenticado — ver
 * supabase/migrations/0005_auth.sql.
 *
 * Não existe cadastro público aqui de propósito: para criar os primeiros
 * usuários (você e quem mais for administrar a liga), use o Supabase
 * Dashboard > Authentication > Users > Add user (e-mail + senha).
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = ainda carregando
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });
    return () => assinatura.subscription.unsubscribe();
  }, []);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }
    // login deu certo — limpa os campos agora, e não só quando a tela de
    // login reaparecer (ela não desmonta ao dar logout, então os valores
    // ficavam preenchidos de uma sessão pra outra se não fizesse isso aqui).
    setEmail('');
    setSenha('');
    setMostrarSenha(false);
  }

  // ainda checando se já existe sessão salva — evita "piscar" a tela de login
  if (session === undefined) {
    return (
      <div className="gate-screen">
        <BrandMark size={44} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="gate-screen">
        <form className="gate-card" onSubmit={entrar}>
          <BrandMark size={44} />
          <strong>Grid Manager</strong>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            autoFocus
          />
          <div className="gate-password-field">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro(null);
              }}
            />
            <button
              type="button"
              className="icon-button gate-toggle-senha"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" className="btn-primary" disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
          {erro && <p className="error">{erro}</p>}
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
