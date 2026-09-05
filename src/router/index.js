import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store/index'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'LoginView',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/system',
    component: () => import('@/components/SystemLayout.vue'),
    meta: { requiresAuth: true },
    redirect: { name: 'ManageUser' },
    children: [
      {
        path: 'users',
        name: 'ManageUser',
        component: () => import('@/views/System/ManageUser.vue'),
        meta: { title: '用户管理', icon: 'el-icon-user' }
      },
      {
        path: 'roles',
        name: 'ManageRole',
        component: () => import('@/views/System/ManageRole.vue'),
        meta: { title: '角色管理', icon: 'el-icon-key' }
      },
      {
        path: 'menus',
        name: 'ManageMenu',
        component: () => import('@/views/System/ManageMenu.vue'),
        meta: { title: '菜单管理', icon: 'el-icon-menu' }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'PivotHub'} - 管理系统`
  const token = store.state.common.token
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/system/users')
  } else {
    next()
  }
})

export default router
