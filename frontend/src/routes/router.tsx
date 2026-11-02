import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { AppLayout } from '@/components/app-layout';
import { PublicOnlyRoute, ProtectedRoute } from './protected-route';

// Pages are lazy so the login page ships a small bundle. DEV-1012 adds its task routes under the protected layout.
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/projects" replace /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('@/pages/login')).LoginPage }),
      },
      {
        path: '/register',
        lazy: async () => ({ Component: (await import('@/pages/register')).RegisterPage }),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/projects',
            lazy: async () => ({ Component: (await import('@/pages/projects')).ProjectsPage }),
          },
          {
            path: '/projects/:projectId',
            lazy: async () => ({
              Component: (await import('@/pages/project-detail')).ProjectDetailPage,
            }),
          },
          {
            path: '/projects/:projectId/tasks',
            lazy: async () => ({ Component: (await import('@/pages/task-list')).TaskListPage }),
          },
          {
            path: '/projects/:projectId/tasks/:taskId',
            lazy: async () => ({
              Component: (await import('@/pages/task-detail')).TaskDetailPage,
            }),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
