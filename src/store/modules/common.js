function validateTokens(tokens) {
  if (!tokens || typeof tokens.accessToken !== 'string' || !tokens.accessToken.trim() ||
      typeof tokens.refreshToken !== 'string' || !tokens.refreshToken.trim() || tokens.clientType !== 1) {
    throw new Error('登录凭证响应无效')
  }
}

function setAuth(state, tokens) {
  state.token = tokens.accessToken
  state.refreshToken = tokens.refreshToken
  state.clientType = tokens.clientType
  state.expiresIn = tokens.expiresIn
  state.refreshExpiresIn = tokens.refreshExpiresIn
}

export default {
  namespaced: true,
  state: {
    token: '', refreshToken: '', clientType: 1,
    expiresIn: null, refreshExpiresIn: null, authVersion: 0
  },
  mutations: {
    SET_AUTH: setAuth,
    BEGIN_LOGIN(state, tokens) {
      state.authVersion += 1
      setAuth(state, tokens)
    },
    CLEAR_AUTH(state) {
      state.authVersion += 1
      state.token = ''
      state.refreshToken = ''
      state.clientType = 1
      state.expiresIn = null
      state.refreshExpiresIn = null
    }
  },
  actions: {
    handleLoginSuccess({ commit, dispatch }, tokens) {
      validateTokens(tokens)
      commit('BEGIN_LOGIN', tokens)
      return dispatch('system/clearSystemState', null, { root: true })
    },
    saveRefresh({ state, commit }, { tokens, authVersion }) {
      if (state.authVersion !== authVersion || !state.token) return false
      validateTokens(tokens)
      commit('SET_AUTH', tokens)
      return true
    },
    logout({ commit, dispatch }) {
      commit('CLEAR_AUTH')
      return dispatch('system/clearSystemState', null, { root: true })
    }
  },
  getters: {
    isLoggedIn: state => !!state.token
  }
}
