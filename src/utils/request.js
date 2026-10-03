import axios from 'axios'
import { getResultData } from '@/utils/result'

const options = {
  baseURL: process.env.VUE_APP_PREFIX_API,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' }
}
const request = axios.create(options)
const refreshClient = axios.create(options)
let hooks
let refreshPending = null

export function configureAuth(authHooks) {
  hooks = authHooks
}

function authChangedError() {
  const error = new Error('登录状态已变化')
  error.authChanged = true
  return error
}

function refreshOnce(authVersion) {
  if (refreshPending && refreshPending.authVersion === authVersion) return refreshPending.promise
  const auth = hooks.getAuth()
  if (auth.authVersion !== authVersion) return Promise.reject(authChangedError())
  const pending = { authVersion, promise: null }
  refreshPending = pending
  pending.promise = Promise.resolve().then(() => {
    if (!auth.refreshToken) throw new Error('缺少刷新凭证')
    return refreshClient.post('/system/auth/refresh', { refreshToken: auth.refreshToken })
  }).then(async response => {
    const tokens = getResultData(response)
    if (!tokens || typeof tokens.accessToken !== 'string' || !tokens.accessToken.trim() ||
        typeof tokens.refreshToken !== 'string' || !tokens.refreshToken.trim() || tokens.clientType !== 1) {
      throw new Error('刷新响应无效')
    }
    if (!await hooks.saveRefresh({ tokens, authVersion })) throw authChangedError()
  }).catch(async error => {
    error.authHandled = true
    if (hooks.getAuth().authVersion === authVersion) await hooks.rejectAuth(authVersion)
    throw error
  }).finally(() => {
    if (refreshPending === pending) refreshPending = null
  })
  return pending.promise
}

request.interceptors.request.use(config => {
  config.headers = config.headers || {}
  if (config.skipAuth) {
    delete config.headers.Authorization
    return config
  }
  const auth = hooks.getAuth()
  if (config._authVersion !== undefined && config._authVersion !== auth.authVersion) {
    throw authChangedError()
  }
  config._authVersion = auth.authVersion
  config._authToken = auth.token
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  else delete config.headers.Authorization
  return config
})

request.interceptors.response.use(response => response, async error => {
  const { response, config } = error
  if (error.authChanged || error.authHandled || (config && config.skipAuth)) throw error
  if (!config) throw error
  if (config._authVersion !== hooks.getAuth().authVersion) {
    error.authChanged = true
    throw error
  }
  const code = response && response.data && response.data.code
  if (code === 40301) {
    error.authHandled = true
    await hooks.rejectAuth(config._authVersion)
    throw error
  }
  if (code !== 40302) {
    if (hooks.reportError) hooks.reportError((response && response.data && response.data.msg) || '请求失败，请检查网络后重试')
    throw error
  }
  if (config._authRetry) {
    error.authHandled = true
    await hooks.rejectAuth(config._authVersion)
    throw error
  }
  config._authRetry = true
  const auth = hooks.getAuth()
  if (config._authToken !== auth.token && auth.token) return request(config)
  await refreshOnce(config._authVersion)
  if (config._authVersion !== hooks.getAuth().authVersion) throw authChangedError()
  return request(config)
})

export default request
