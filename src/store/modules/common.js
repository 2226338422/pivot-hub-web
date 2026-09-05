import router from '@/router'
import { Message } from 'element-ui'

export default {
  namespaced: true,
  state: {
    token: '',       // accessToken
    refreshToken: '', // refreshToken
    role: ''         // 当前角色：admin / manager / customer / merchant
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
    },
    SET_REFRESH_TOKEN(state, token) {
      state.refreshToken = token
    },
    SET_ROLE(state, role) {
      state.role = role
    },
    CLEAR_AUTH(state) {
      state.token = ''
      state.refreshToken = ''
      state.role = ''
    }
  },
  actions: {
    handleLoginSuccess({ commit }, { accessToken, refreshToken, role }) {
      commit('SET_TOKEN', accessToken)
      commit('SET_REFRESH_TOKEN', refreshToken)
      commit('SET_ROLE', role)
    },
    logout({ commit }) {
      commit('CLEAR_AUTH')
      localStorage.clear()
      sessionStorage.clear()
    }
  },
  getters: {
    isLoggedIn: state => !!state.token,
    currentRole: state => state.role
  }
}
