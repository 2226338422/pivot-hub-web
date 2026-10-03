import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import { configureAuth } from '@/utils/request'

Vue.config.productionTip = false
Vue.use(ElementUI)

// 修复 Vue Router 重复导航报错
const originalPush = VueRouter.prototype.push
const originalReplace = VueRouter.prototype.replace
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated') throw err
  })
}
VueRouter.prototype.replace = function replace(location) {
  return originalReplace.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated') throw err
  })
}

import VueRouter from 'vue-router'
Vue.use(VueRouter)

configureAuth({
  getAuth: () => ({ ...store.state.common }),
  saveRefresh: payload => store.dispatch('common/saveRefresh', payload),
  async rejectAuth(authVersion) {
    if (store.state.common.authVersion !== authVersion) return
    await store.dispatch('common/logout')
    if (store.state.common.authVersion !== authVersion + 1 || store.state.common.token) return
    ElementUI.Message.error('登录已失效，请重新登录')
    await router.replace('/login').catch(() => {})
  },
  reportError: message => ElementUI.Message.error(message)
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
