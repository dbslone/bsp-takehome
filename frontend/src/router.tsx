import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout'
import BriefPage from './pages/BriefPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import RouteErrorPage from './pages/RouteErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage />, errorElement: <RouteErrorPage /> },
      { path: 'brief/:id', element: <BriefPage />, errorElement: <RouteErrorPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
