import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PAGES } from './pages';
import { HOME_PATH, SCREENS } from './navigation';

// HashRouter: links do tipo /#/alertas funcionam no GitHub Pages sem configuração de servidor.
const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={HOME_PATH} replace /> },
      ...SCREENS.map((screen) => {
        const Page = PAGES[screen.id] ?? PlaceholderPage;
        return { path: screen.path, element: <Page screen={screen} /> };
      }),
      { path: '*', element: <Navigate to={HOME_PATH} replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
