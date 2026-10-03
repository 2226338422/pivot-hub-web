import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store/index'
import { menuRoutes } from './menuRoutes'
import { getAllowedPaths, getLoginTarget, normalizeMenuPath } from '@/utils/menu'

Vue.use(VueRouter)

const routes = [
  {
    path: '/login', name: 'LoginView',
    component: () => import('@/views/LoginView.vue'), meta: { title: '登录' }
  },
  {
    path: '/', component: () => import('@/components/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      ...menuRoutes,
      {
        path: 'access-state', name: 'AccessState',
        component: () => import('@/views/System/AccessStateView.vue'),
        meta: { title: '访问状态', requiresAuth: true, permissionExempt: true }
      }
    ]
  },
  { path: '*', redirect: '/' }
]

const router = new VueRouter({ mode: 'history', base: process.env.BASE_URL, routes })

router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta.title || 'PivotHub'} - 管理系统`
  const auth = store.state.common
  const requiresAuth = to.matched.some(route => route.meta.requiresAuth)
  if (requiresAuth && !auth.token) return next({ path: '/login', query: { redirect: to.fullPath }, replace: true })
  if (!requiresAuth && (to.path !== '/login' || !auth.token)) return next()
  if (to.meta.permissionExempt) return next()
  const authVersion = auth.authVersion
  try {
    await store.dispatch('system/ensureMenusLoaded')
  } catch (error) {
    if (!auth.token) return next({ path: '/login', replace: true })
    if (error.authChanged || auth.authVersion !== authVersion) return next(false)
    return next({ path: '/access-state', query: { kind: 'error' }, replace: true })
  }
  if (auth.authVersion !== authVersion) return next(false)
  const tree = store.state.system.menuTree
  if (to.path === '/' || to.path === '/login') {
    const target = getLoginTarget(tree, to.path === '/login' ? to.query.redirect : null)
    return next(typeof target === 'string' ? { path: target, replace: true } : { ...target, replace: true })
  }
  if (getAllowedPaths(tree).has(normalizeMenuPath(to.path))) return next()
  return next({ path: '/access-state', query: { kind: 'forbidden' }, replace: true })
})

export default router
