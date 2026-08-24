import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ContextSelectors from './components/ContextSelectors';
import AuthGate from './components/AuthGate';
import BrandMark from './components/BrandMark';
import { f1 } from './lib/supabaseClient';
import { AppContextProvider } from './context/AppContext';
import { PAGE_TITLES, type PageKey } from './pages';
import AnoPage from './pages/AnoPage';
import ParametrosPage from './pages/ParametrosPage';
import PontuacaoPage from './pages/PontuacaoPage';
import CalendarioPage from './pages/CalendarioPage';
import PilotosPage from './pages/PilotosPage';
import EquipesPage from './pages/EquipesPage';
import TimesPage from './pages/TimesPage';
import ProvaAProvaPage from './pages/ProvaAProvaPage';
import ClassificacaoGeralPage from './pages/ClassificacaoGeralPage';
import ClassificacaoPorProvaPage from './pages/ClassificacaoPorProvaPage';
import RecordesCadastroPage from './pages/RecordesCadastroPage';
import RecordesPage from './pages/RecordesPage';
import ConfrontoPage from './pages/ConfrontoPage';
import DashboardPilotosPage from './pages/DashboardPilotosPage';
import DashboardEquipesPage from './pages/DashboardEquipesPage';

const PAGES: Record<PageKey, JSX.Element> = {
  ano: <AnoPage />,
  parametros: <ParametrosPage />,
  pontuacao: <PontuacaoPage />,
  calendario: <CalendarioPage />,
  pilotos: <PilotosPage />,
  equipes: <EquipesPage />,
  times: <TimesPage />,
  recordesCadastro: <RecordesCadastroPage />,
  provaAProva: <ProvaAProvaPage />,
  classificacaoGeral: <ClassificacaoGeralPage />,
  classificacaoPorProva: <ClassificacaoPorProvaPage />,
  recordes: <RecordesPage />,
  confronto: <ConfrontoPage />,
  dashboardPilotos: <DashboardPilotosPage />,
  dashboardEquipes: <DashboardEquipesPage />
};

const PAGINAS_COM_TEMPORADA: PageKey[] = [
  'times',
  'provaAProva',
  'classificacaoGeral',
  'classificacaoPorProva',
  'dashboardPilotos',
  'recordes'
];

function AppShell() {
  // Enquanto não existir nenhum ano_jogo gravado, a tela inicial é a de
  // Ano (é o primeiro cadastro que precisa ser feito). Assim que já
  // existir pelo menos um, a tela inicial passa a ser a Classificação
  // Geral — mais útil no dia a dia do que ficar caindo sempre no cadastro.
  // `page === null` = ainda checando; só decide a tela inicial uma vez,
  // ao entrar no app (depois disso a navegação manual do usuário manda).
  const [page, setPage] = useState<PageKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    f1()
      .from('tb_ano')
      .select('id')
      .limit(1)
      .then(({ data }) => {
        setPage(data && data.length > 0 ? 'classificacaoGeral' : 'ano');
      });
  }, []);

  if (!page) {
    return (
      <div className="gate-screen">
        <BrandMark size={44} />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} menuOpen={menuOpen} onCloseMenu={() => setMenuOpen(false)} />
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <div className="topbar-row">
            <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="page-title">
              <span>F1 MANAGER</span>
              <h1>{PAGE_TITLES[page]}</h1>
            </div>
          </div>
          <ContextSelectors showTemporada={PAGINAS_COM_TEMPORADA.includes(page)} />
        </header>

        <section className="content">{PAGES[page]}</section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AppContextProvider>
        <AppShell />
      </AppContextProvider>
    </AuthGate>
  );
}
