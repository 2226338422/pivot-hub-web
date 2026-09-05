import axios from 'axios'
import store from '@/store/index'
import { Message } from 'element-ui'
import router from '@/router'

const request = axios.create({
  baseURL: process.env.VUE_APP_PREFIX_API,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// ---------- Token 刷新机制 ----------
let isRefreshing = false
let pendingRequests = []

function refreshTokenApi(refreshToken) {
  const role = store.state.common.role
  if (!role) {
    return Promise.reject(new Error('无法获取用户角色'))
  }
  // TODO: 根据实际后端刷新接口路径调整
  return axios({
    method: 'post',
    url: `${process.env.VUE_APP_BASE_API}/system/auth/refreshToken`,
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'Content-Type': 'application/json'
    }
  })
}

function processPendingRequests(error, newToken = null) {
  pendingRequests.forEach(p => {
    if (error) p.reject(error)
    else p.resolve(newToken)
  })
  pendingRequests = []
}

let isLoggingOut = false

function logout() {
  if (isLoggingOut) return
  isLoggingOut = true
  store.dispatch('common/logout')
  store.dispatch('system/clearSystemState')
  Message.error('登录已过期，请重新登录')
  router.replace('/login').catch(() => {})
  setTimeout(() => { isLoggingOut = false }, 1000)
}

// ---------- 请求拦截器 ----------
request.interceptors.request.use(config => {
  const token = store.state.common.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------- 响应拦截器 ----------
request.interceptors.response.use(
  response => response,
  async error => {
    const { response, config } = error
    if (!response) return Promise.reject(error)

    const { data } = response

    // 40301 / 40302 = Token 需刷新
    if (data && data.code && (data.code === 40301 || data.code === 40302)) {
      const refreshToken = store.state.common.refreshToken
      if (!refreshToken) {
        logout()
        return Promise.reject(error)
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject, config })
        }).then(newToken => {
          config.headers.Authorization = `Bearer ${newToken}`
          return request(config)
        }).catch(err => Promise.reject(err))
      }
      isRefreshing = true
      try {
        const refreshRes = await refreshTokenApi(refreshToken)
        const refreshData = refreshRes.data
        if (refreshData.code === 201 || refreshData.code === 200) {
          await store.dispatch('common/handleLoginSuccess', {
            accessToken: refreshData.data.accessToken,
            refreshToken: refreshData.data.refreshToken,
            role: store.state.common.role
          })
          processPendingRequests(null, refreshData.data.accessToken)
          config.headers.Authorization = `Bearer ${refreshData.data.accessToken}`
          return request(config)
        }
        throw new Error(refreshData.msg || 'Token 刷新失败')
      } catch (e) {
        logout()
        processPendingRequests(e)
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    // 其他业务错误（非 200/201）
    if (data && data.code && data.code !== 200 && data.code !== 201) {
      Message.error(data.msg || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
