export const menuRoutes = [
  { path: 'home', name: 'SystemHome', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
  { path: 'map/favorites', name: 'MapFavorites', component: () => import('@/views/Map/MapFavoritesView.vue'), meta: { title: '地点收藏' } },
  { path: 'community/developer', name: 'DeveloperCommunity', component: () => import('@/views/Community/DeveloperCommunityView.vue'), meta: { title: '开发者社区' } },
  { path: 'community/public', name: 'PublicCommunity', component: () => import('@/views/Community/PublicCommunityView.vue'), meta: { title: '公共社区' } },
  { path: 'system/roles', name: 'SystemRoleManagement', component: () => import('@/views/System/Role/RoleManagementView.vue'), meta: { title: '角色管理' } }
]

export const registeredMenuPaths = new Set(menuRoutes.map(route => `/${route.path}`))
