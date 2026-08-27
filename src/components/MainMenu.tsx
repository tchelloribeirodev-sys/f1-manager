import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { PageKey } from '../pages';
import { supabase } from '../lib/supabaseClient';
import { GRUPOS } from '../lib/menuGroups';
import BrandMark from './BrandMark';

interface Props {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
}

/**
 * Menu principal exibido no topo em telas desktop (>900px), substituindo a
 * Sidebar nesse breakpoint — a troca entre os dois é feita só via CSS (ver
 * `.main-menu` / `.sidebar` em styles.css), então em qualquer largura só um
 * dos dois fica visível. Cada grupo vira um item com dropdown, e o grupo que
 * contém a página atual recebe um sublinhado indicando onde o usuário está.
 */
export default function MainMenu({ page, onNavigate }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <nav className="main-menu" ref={wrapRef}>
      <div className="main-menu-brand">
        <BrandMark size={28} />
        <strong>Grid Manager</strong>
      </div>

      <div className="main-menu-items">
        {GRUPOS.map((grupo) => {
          const GrupoIcon = grupo.icone;
          const ativo = grupo.itens.some((item) => item.key === page);
          const aberto = openGroup === grupo.titulo;
          return (
            <div key={grupo.titulo} className="main-menu-item-wrap">
              <button
                className={ativo ? 'main-menu-top-item active' : 'main-menu-top-item'}
                onClick={() => setOpenGroup(aberto ? null : grupo.titulo)}
              >
                <GrupoIcon size={16} />
                <span>{grupo.titulo}</span>
                <ChevronDown size={14} className={aberto ? 'chevron open' : 'chevron'} />
              </button>

              {aberto && (
                <div className="main-menu-dropdown">
                  {grupo.itens.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      className={page === key ? 'main-menu-dropdown-item active' : 'main-menu-dropdown-item'}
                      onClick={() => {
                        onNavigate(key);
                        setOpenGroup(null);
                      }}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="main-menu-user">
        <span title={email ?? ''}>{email ?? '—'}</span>
        <button className="icon-button" title="Sair" onClick={() => supabase.auth.signOut()}>
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}
