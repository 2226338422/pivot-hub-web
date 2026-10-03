import { getCurrentUser } from '@/api/system/user'
import { getMenuTree } from '@/api/system/menu'
import { getResultData } from '@/utils/result'
import { normalizeMenuTree } from '@/utils/menu'

let currentLoadId = 0
let loadPending = null

function authChangedError() {
  const error = new Error('登录状态已变化')
  error.authChanged = true
  return error
}

export default {
  namespaced: true,
  state: { userInfo: null, menuTree: [], menusLoaded: false, menuLoadError: null },
  mutations: {
    BEGIN_LOAD(state) {
      state.menusLoaded = false
      state.menuLoadError = null
    },
    SET_SESSION_VIEW(state, { userInfo, menuTree }) {
      state.userInfo = userInfo
      state.menuTree = menuTree
      state.menusLoaded = true
      state.menuLoadError = null
    },
    SET_LOAD_ERROR(state, message) {
      state.userInfo = null
      state.menuTree = []
      state.menusLoaded = false
      state.menuLoadError = message
    },
    CLEAR_SYSTEM_STATE(state) {
      state.userInfo = null
      state.menuTree = []
      state.menusLoaded = false
      state.menuLoadError = null
    }
  },
  actions: {
    async fetchUserInfo() {
      const userInfo = getResultData(await getCurrentUser())
      if (!userInfo || typeof userInfo !== 'object' || Array.isArray(userInfo)) {
        throw new Error('用户资料格式不正确')
      }
      return userInfo
    },
    async fetchMenuTree() {
      const tree = getResultData(await getMenuTree())
      if (!Array.isArray(tree)) throw new Error('菜单数据格式不正确')
      return normalizeMenuTree(tree)
    },
    ensureMenusLoaded({ state, rootState, commit, dispatch }, { force = false } = {}) {
      if (!rootState.common.token) return Promise.reject(authChangedError())
      const authVersion = rootState.common.authVersion
      if (!force && state.menusLoaded) return Promise.resolve(state.menuTree)
      if (!force && loadPending && loadPending.authVersion === authVersion) return loadPending.promise
      const loadId = ++currentLoadId
      const pending = { authVersion, promise: null }
      loadPending = pending
      commit('BEGIN_LOAD')
      pending.promise = Promise.all([dispatch('fetchUserInfo'), dispatch('fetchMenuTree')])
        .then(([userInfo, menuTree]) => {
          if (authVersion !== rootState.common.authVersion || loadId !== currentLoadId) throw authChangedError()
          commit('SET_SESSION_VIEW', { userInfo, menuTree })
          return menuTree
        }).catch(error => {
          if (authVersion !== rootState.common.authVersion || loadId !== currentLoadId) throw authChangedError()
          commit('SET_LOAD_ERROR', (error.response && error.response.data && error.response.data.msg) || error.message || '菜单加载失败')
          throw error
        }).finally(() => {
          if (loadPending === pending) loadPending = null
        })
      return pending.promise
    },
    clearSystemState({ commit }) {
      currentLoadId += 1
      loadPending = null
      commit('CLEAR_SYSTEM_STATE')
    }
  },
  getters: {
    menuTree: state => state.menuTree,
    userInfo: state => state.userInfo
  }
}
