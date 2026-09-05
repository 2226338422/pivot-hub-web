import request from '@/utils/request'

export default {
  namespaced: true,
  state: {
    // 从后端加载后的动态菜单树（供侧边栏渲染）
    menuTree: [],
    // 当前登录用户 ID（由登录态或权限模块维护）
    currentUserId: null,
    // 用户角色列表
    roles: []
  },
  mutations: {
    SET_MENU_TREE(state, tree) {
      state.menuTree = tree
    },
    SET_USER_INFO(state, { userId, roles }) {
      state.currentUserId = userId
      state.roles = roles || []
    },
    CLEAR_SYSTEM_STATE(state) {
      state.menuTree = []
      state.currentUserId = null
      state.roles = []
    }
  },
  actions: {
    // 登录后根据 userId 加载菜单树
    async fetchMenuTree({ commit, rootState }, userId) {
      const res = await request.get(`/system/menu/tree/${userId}`)
      if (res.data.code === 201 || res.data.code === 200) {
        commit('SET_MENU_TREE', res.data.data)
        commit('SET_USER_INFO', { userId, roles: [] })
      }
    },
    // 登出时清理系统状态
    clearSystemState({ commit }) {
      commit('CLEAR_SYSTEM_STATE')
    }
  },
  getters: {
    menuTree: state => state.menuTree,
    currentUserId: state => state.currentUserId
  }
}
