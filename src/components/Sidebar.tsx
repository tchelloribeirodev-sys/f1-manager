import { useEffect, useState } from 'react';
import { ChevronRight, LogOut, Moon, Sun, X } from 'lucide-react';
import type { PageKey } from '../pages';
import { supabase } from '../lib/supabaseClient';
import { GRUPOS } from '../lib/menuGroups';
import { useTheme } from '../context/ThemeContext';
import BrandMark from './BrandMark';

interface Props {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
  menuOpen: boolean;
  onCloseMenu: () => void;
}

export default function Sidebar({ page, onNavigate, menuOpen, onCloseMenu }: Props) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({
    Cadastros: true,
    Resultados: true,
    Dashboards: true
  });
  const [email, setEmail] = useState<string | null>(null);
  const { tema, alternarTema } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand">
        <BrandMark />
        <div>
          <strong>Grid Manager</strong>
          <span>Web Edition</span>
        </div>
        <button className="icon-button close-menu" onClick={onCloseMenu}>
          <X size={20} />
        </button>
      </div>

      <div className="nav-title">MENU</div>
      <nav>
        {GRUPOS.map((grupo) => {
          const GrupoIcon = grupo.icone;
          const aberto = abertos[grupo.titulo];
          return (
            <div key={grupo.titulo}>
              <button
                className="nav-group-toggle"
                onClick={() => setAbertos((a) => ({ ...a, [grupo.titulo]: !a[grupo.titulo] }))}
              >
                <GrupoIcon size={18} />
                <span>{grupo.titulo}</span>
                <ChevronRight size={16} className={aberto ? 'chevron open' : 'chevron'} />
              </button>

              {aberto &&
                grupo.itens.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={page === key ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}
                    onClick={() => {
                      onNavigate(key);
                      onCloseMenu();
                    }}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span title={email ?? ''}>{email ?? '—'}</span>
          <button
            className="icon-button theme-toggle"
            title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            onClick={alternarTema}
          >
            {tema === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="icon-button" title="Sair" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
