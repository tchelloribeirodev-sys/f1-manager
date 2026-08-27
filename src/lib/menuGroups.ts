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
  FolderCog
} from 'lucide-react';
import type { PageKey } from '../pages';

export type MenuItem = { key: PageKey; label: string; icon: typeof Flag };
export type MenuGroup = { titulo: string; icone: typeof Flag; itens: MenuItem[] };

// Fonte única dos grupos de navegação: usada tanto pela Sidebar (drawer,
// exibido no mobile) quanto pelo MainMenu (barra superior com dropdowns,
// exibido no desktop) — mantém os dois em sincronia automaticamente.
export const GRUPOS: MenuGroup[] = [
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
