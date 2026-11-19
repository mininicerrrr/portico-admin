import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: {
          title: '概览',
          breadcrumb: ['首页', '概览'],
        },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UsersView.vue'),
        meta: {
          title: '用户列表',
          breadcrumb: ['首页', '用户管理', '用户列表'],
        },
      },
      {
        path: 'form-demo',
        name: 'form-demo',
        component: () => import('../views/FormDemoView.vue'),
        meta: {
          title: '示例表单',
          breadcrumb: ['首页', '表单', '示例表单'],
        },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue'),
        meta: {
          title: '设置',
          breadcrumb: ['首页', '设置'],
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? 'Portico Admin'
  document.title = `${title} · Portico Admin`
})

export default router