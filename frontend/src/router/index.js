import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/gastos',
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
  // Catch-all — redireciona para gastos
  { path: '/:pathMatch(.*)*', redirect: '/gastos' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
