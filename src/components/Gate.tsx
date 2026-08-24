import { useState, type ReactNode } from 'react';

const SESSION_KEY = 'f1_unlocked';

/**
 * Proteção leve e opcional: como este app agora é 100% client-side (Vite),
 * se você publicar a URL sem nenhuma autenticação, qualquer pessoa que
 * abrir o link consegue editar os cadastros. Definindo VITE_APP_PASSWORD
 * no .env.local, esta tela pede uma senha simples antes de mostrar o app.
 *
 * Isso NÃO é segurança real (a senha fica no bundle do front-end) — é só
 * uma cortina para não deixar a URL totalmente aberta. Para algo sério,
 * a recomendação é Supabase Auth (posso incluir numa próxima etapa).
 */
export default function Gate({ children }: { children: ReactNode }) {
  const requiredPassword = import.meta.env.VITE_APP_PASSWORD as string | undefined;
  const [unlocked, setUnlocked] = useState(
    !requiredPassword || sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === requiredPassword) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <div className="gate-screen">
      <form className="gate-card" onSubmit={handleSubmit}>
        <div className="brand-mark">F1</div>
        <strong>F1 Manager</strong>
        <input
          type="password"
          placeholder="Senha de acesso"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          autoFocus
        />
        <button type="submit" className="btn-primary">
          Entrar
        </button>
        {error && <p className="error">Senha incorreta.</p>}
      </form>
    </div>
  );
}
