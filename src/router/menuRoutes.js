export const menuRoutes = [
  { path: 'home', name: 'SystemHome', component: () => import('@/views/System/HomeView.vue'), meta: { title: '首页' } },
  { path: 'community/developer', name: 'DeveloperCommunity', component: () => import('@/views/System/Community/DeveloperCommunityView.vue'), meta: { title: '开发者社区' } },
  { path: 'community/public', name: 'PublicCommunity', component: () => import('@/views/System/Community/PublicCommunityView.vue'), meta: { title: '公共社区' } }
]

export const registeredMenuPaths = new Set(menuRoutes.map(route => `/${route.path}`))
