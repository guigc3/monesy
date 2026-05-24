import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/visao-geral',
  },
  {
    path: '/visao-geral',
    name: 'visao-geral',
    component: () => import('@/views/VisaoGeralView.vue'),
  },
  {
    path: '/gastos',
    name: 'gastos',
    component: () => import('@/views/GastosView.vue'),
  },
  {
    path: '/assinaturas',
    name: 'assinaturas',
    component: () => import('@/views/AssinaturasView.vue'),
  },
  {
    path: '/features',
    name: 'features',
    component: () => import('@/views/FeaturesView.vue'),
  },
  // Catch-all — redireciona para visão geral
  { path: '/:pathMatch(.*)*', redirect: '/visao-geral' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
