import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import common from './modules/common'
import system from './modules/system'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    common,
    system
  },
  plugins: [
    createPersistedState({
      key: 'pivot-hub',
      paths: ['common', 'system']
    })
  ]
})
