// 获取并缓存高德地图运行时配置，校验登录会话并协调地图代理认证刷新。
import store from '@/store'
import { getRuntimeMapConfig } from '@/api/business/map'
import { configureMapWorkerRefresh, normalizeMapServiceHost, syncMapWorkerAuth } from '@/utils/map/mapProxyWorker'
let cached = null
let pending = null
let generation = 0
const auth = () => store.state.common
export function invalidateMapProxyAuth(accountChanged = true) { if (accountChanged) generation += 1; cached = null; pending = null }
export function assertMapProxyAuth(config) {
  const state = auth()
  if (!cached || cached.config !== config || cached.version !== state.authVersion || cached.token !== state.token || !state.token) throw new Error('登录状态已变化，请重新同步地图')
}
export function ensureMapProxyAuth(force = false) {
  const state = auth()
  if (!state.token) return Promise.reject(new Error('请先登录'))
  const version = state.authVersion; const token = state.token
  if (!force && cached && cached.version === version && cached.token === token) return Promise.resolve(cached.config)
  if (pending && pending.version === version && pending.token === token) return pending.promise
  const ticket = generation; const item = { version, token, promise: null }; pending = item
  item.promise = getRuntimeMapConfig().then(async config => {
    if (ticket === generation && auth().authVersion === version && config._requestToken !== auth().token) config = await getRuntimeMapConfig()
    if (ticket !== generation || auth().authVersion !== version || !auth().token) throw new Error('登录状态已变化')
    if (config._requestToken !== auth().token) throw new Error('地图凭证同步期间登录令牌变化，请重试')
    if (!config || typeof config.jsKey !== 'string' || !config.jsKey.trim()) throw new Error('地图代理配置无效')
    const host = normalizeMapServiceHost(config.serviceHost)
    const result = { jsKey: config.jsKey, serviceHost: new URL(host, window.location.origin).href }
    cached = { version, token: auth().token, config: result }; return result
  }).finally(() => { if (pending === item) pending = null })
  return item.promise
}

configureMapWorkerRefresh(async () => {
  const config = await ensureMapProxyAuth(true)
  await syncMapWorkerAuth(config)
})
