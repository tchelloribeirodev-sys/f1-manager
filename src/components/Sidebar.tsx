import { useEffect, useState } from 'react';
import {
  CalendarDays,
  SlidersHorizontal,
  ListOrdered,
  Flag,
  Users,
  Gauge,
  UserCog,
  Trophy,
  Award,
  Table2,
  Medal,
  ClipboardList,
  ArrowLeftRight,
  LineChart,
  ChevronRight,
  FolderCog,
  LogOut,
  X
} from 'lucide-react';
import type { PageKey } from '../pages';
import { supabase } from '../lib/supabaseClient';
import BrandMark from './BrandMark';

type Item = { key: PageKey; label: string; icon: typeof Flag };

const GRUPOS: { titulo: string; icone: typeof Flag; itens: Item[] }[] = [
  {
    titulo: 'Cadastros',
    icone: FolderCog,
    itens: [
      { key: 'ano', label: 'Ano do jogo', icon: CalendarDays },
      { key: 'parametros', label: 'Parâmetros', icon: SlidersHorizontal },
      { key: 'pontuacao', label: 'Pontuação', icon: ListOrdered },
      { key: 'calendario', label: 'Calendário / Provas', icon: Flag },
      { key: 'bandeiras', label: 'Bandeiras', icon: Flag },
      { key: 'pilotos', label: 'Pilotos', icon: Users },
      { key: 'equipes', label: 'Equipes', icon: Gauge },
      { key: 'times', label: 'Times', icon: UserCog },
      { key: 'recordesCadastro', label: 'Cadastro de Recordes', icon: ClipboardList }
    ]
  },
  {
    titulo: 'Resultados',
    icone: Trophy,
    itens: [
      { key: 'provaAProva', label: 'Prova a Prova', icon: Trophy },
      { key: 'classificacaoGeral', label: 'Classificação Geral', icon: Award },
      { key: 'classificacaoPorProva', label: 'Classificação Prova a Prova', icon: Table2 },
      { key: 'recordes', label: 'Recordes', icon: Medal },
      { key: 'confronto', label: 'Cara a Cara', icon: ArrowLeftRight }
    ]
  },
  {
    titulo: 'Dashboards',
    icone: LineChart,
    itens: [
      { key: 'dashboardPilotos', label: 'Pilotos', icon: LineChart },
      { key: 'dashboardEquipes', label: 'Equipes', icon: LineChart }
    ]
  }
];

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
          <button className="icon-button" title="Sair" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
