// 加载并复用高德地图 SDK，同步地图代理认证，处理加载超时与取消。
import AMapLoader from '@amap/amap-jsapi-loader'
import { assertMapProxyAuth, ensureMapProxyAuth } from '@/config/amap'
import { syncMapWorkerAuth } from '@/utils/map/mapProxyWorker'
let pending = null
let sdkKey = null
export async function syncAMapProxyAuth(force = false) {
  const config = await ensureMapProxyAuth(force)
  if (sdkKey && sdkKey !== config.jsKey) throw new Error('地图 Key 已更改，请刷新页面')
  await syncMapWorkerAuth(config)
  assertMapProxyAuth(config)
  window._AMapSecurityConfig = { serviceHost: config.serviceHost }
  return config
}
export async function loadAMap({ signal } = {}) {
  const config = await syncAMapProxyAuth()
  if (signal && signal.aborted) throw new Error('地图加载已取消')
  if (!pending) {
    sdkKey = config.jsKey
    const attempt = AMapLoader.load({ key: sdkKey, version: '2.0', plugins: ['AMap.Geolocation'] })
    const wrapped = attempt.catch(error => {
      if (pending === wrapped) { pending = null; sdkKey = null; AMapLoader.reset() }
      throw error || new Error('地图加载失败')
    })
    pending = wrapped
  }
  const attempt = pending
  return new Promise((resolve, reject) => {
    const finish = (error, value) => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); if (error) reject(error); else resolve(value) }
    const abort = () => finish(new Error('地图加载已取消'))
    const timer = setTimeout(() => finish(new Error('地图加载超时，请重试；正在加载的 SDK 会继续等待')), 15000)
    if (signal) signal.addEventListener('abort', abort, { once: true })
    attempt.then(value => finish(null, value), error => finish(error))
  })
}
