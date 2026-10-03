import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import common from './modules/common'
import system from './modules/system'

Vue.use(Vuex)

const authFields = ['token', 'refreshToken', 'clientType', 'expiresIn', 'refreshExpiresIn']
const readAuth = (key, storage) => {
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null')
    if (!saved || !saved.common) return undefined
    const common = {}
    authFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(saved.common, field)) {
        common[field] = saved.common[field]
      }
    })
    return { common }
  } catch (error) {
    storage.removeItem(key)
    return undefined
  }
}

export default new Vuex.Store({
  modules: { common, system },
  plugins: [
    createPersistedState({
      key: 'pivot-hub',
      paths: authFields.map(field => `common.${field}`),
      getState: readAuth
    })
  ]
})
