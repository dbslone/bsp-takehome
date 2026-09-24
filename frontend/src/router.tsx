import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout'
import BriefPage from './pages/BriefPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'brief/:id', element: <BriefPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
