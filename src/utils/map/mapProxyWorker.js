// 注册地图代理 Service Worker，管理页面与 Worker 之间的认证同步、刷新及失效处理。
import store from '@/store'
import router from '@/router'
import { Message } from 'element-ui'

const PROTOCOL = 'pivot-map-proxy-v1'
const DEFAULT_HOST = '/api/business/map/amap/_AMapService'
let generation = 0
let lastVersion = store.state.common.authVersion
let lastToken = store.state.common.token
let serviceHost = DEFAULT_HOST
let expectedScript = null
let preparing = null
let prepareSequence = 0
let refreshHandler = null
let refreshing = null
let listening = false

export function normalizeMapServiceHost(value = DEFAULT_HOST) {
  if (typeof value !== 'string' || !value || /[%\\;\s]/.test(value)) throw new Error('地图代理路径无效')
  const path = value.replace(/\/$/, '')
  if (path.split('/').some(part => part === '.' || part === '..')) throw new Error('地图代理路径无效')
  const url = new URL(path, window.location.origin)
  if (url.origin !== window.location.origin || url.search || url.hash || !url.pathname.endsWith('/_AMapService') || url.pathname.includes('//')) throw new Error('地图代理必须使用同源服务')
  return url.pathname
}

function snapshot() {
  const auth = store.state.common
  if (auth.authVersion !== lastVersion || auth.token !== lastToken) { generation++; lastVersion = auth.authVersion; lastToken = auth.token }
  return { protocol: PROTOCOL, generation, authVersion: auth.authVersion, token: auth.token || '', serviceHost }
}

function isOwnController(worker = navigator.serviceWorker.controller) {
  return !!worker && !!expectedScript && worker.scriptURL === expectedScript
}

function sendAuth(worker, state) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('地图登录同步超时，请重试')) }, 8000)
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close()
      const current = snapshot(); const reply = event.data
      if (!reply || !reply.ok || reply.protocol !== PROTOCOL || reply.generation !== state.generation || reply.authVersion !== state.authVersion || current.generation !== state.generation || !isOwnController(worker)) reject(new Error('地图登录状态已变化，请重试'))
      else resolve()
    }
    try { worker.postMessage({ ...state, type: 'sync-auth' }, [channel.port2]) }
    catch (error) { clearTimeout(timer); channel.port1.close(); reject(new Error('地图登录同步失败，请重试')) }
  })
}

async function rejectAuth(data) {
  const state = snapshot()
  if (!state.token || state.authVersion !== data.authVersion || state.generation !== data.generation) return
  await store.dispatch('common/logout')
  if (store.state.common.authVersion !== state.authVersion + 1 || store.state.common.token) return
  Message.error('登录已失效，请重新登录')
  await router.replace('/login').catch(() => {})
}

function listen() {
  if (listening) return
  listening = true
  store.subscribe(() => {
    const previous = generation; const state = snapshot()
    if (previous !== generation && isOwnController()) sendAuth(navigator.serviceWorker.controller, state).catch(() => {})
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (isOwnController()) sendAuth(navigator.serviceWorker.controller, snapshot()).catch(() => {}) })
  navigator.serviceWorker.addEventListener('message', async event => {
    const data = event.data
    if (!data || data.protocol !== PROTOCOL || !isOwnController(event.source) || event.source !== navigator.serviceWorker.controller) return
    if (data.type === 'auth-invalid') { rejectAuth(data).catch(() => {}); return }
    if (data.type !== 'request-auth' && data.type !== 'refresh-auth') return
    const port = event.ports[0]
    if (!port) return
    try {
      let state = snapshot()
      if (data.type === 'refresh-auth') {
        if (!state.token || state.authVersion !== data.authVersion || !refreshHandler) throw new Error('登录状态已变化')
        if (state.generation === data.generation) {
          if (!refreshing || refreshing.authVersion !== state.authVersion) {
            const item = { authVersion: state.authVersion, promise: null }
            item.promise = Promise.resolve().then(() => refreshHandler()).finally(() => { if (refreshing === item) refreshing = null })
            refreshing = item
          }
          await refreshing.promise
        }
        state = snapshot()
        if (!state.token || state.authVersion !== data.authVersion) throw new Error('登录状态已变化')
      }
      port.postMessage({ ...state, ok: true })
    } catch (error) {
      // 认证失败由原 Axios 流程处理；菜单/配置服务故障不能退出有效会话。
      port.postMessage({ ok: false, protocol: PROTOCOL })
    }
    finally { port.close() }
  })
}

export function configureMapWorkerRefresh(handler) { refreshHandler = handler }

function prepareWorker() {
  const attempt = { sequence: ++prepareSequence, cancelled: false, deadline: Date.now() + 10000, cancelWait: null }
  const timeoutError = () => new Error('地图 Service Worker 注册或接管超时，请重试；部署时需提供 map-proxy-sw.js')
  const assertCurrent = () => {
    if (attempt.cancelled || attempt.sequence !== prepareSequence || Date.now() >= attempt.deadline) throw timeoutError()
  }
  const cancel = error => { attempt.cancelled = true; if (attempt.cancelWait) attempt.cancelWait(error || timeoutError()) }
  let timer
  const deadline = new Promise((resolve, reject) => {
    timer = setTimeout(() => { const error = timeoutError(); cancel(error); reject(error) }, Math.max(0, attempt.deadline - Date.now()))
  })
  const work = (async () => {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || typeof MessageChannel === 'undefined') throw new Error('地图需要 HTTPS 或 localhost，并需要浏览器支持 Service Worker')
    const base = new URL(process.env.BASE_URL || '/', window.location.origin)
    if (base.origin !== window.location.origin || base.search || base.hash || /[%\\;]/.test(base.pathname)) throw new Error('地图部署路径无效')
    if (!base.pathname.endsWith('/')) base.pathname += '/'
    if (!window.location.pathname.startsWith(base.pathname)) throw new Error('当前页面不在地图服务作用域内')
    const script = new URL('map-proxy-sw.js', base)
    script.searchParams.set('proxy', serviceHost)
    const owns = worker => !!worker && worker.scriptURL === script.href
    assertCurrent()
    expectedScript = script.href
    const registrations = await navigator.serviceWorker.getRegistrations()
    assertCurrent()
    const existing = registrations.find(item => item.scope === base.href)
    if (existing && [existing.active, existing.waiting, existing.installing].some(worker => worker && !owns(worker))) throw new Error('当前作用域已有其他 Service Worker 或不同地图代理配置，请先解决冲突')
    if (navigator.serviceWorker.controller && !owns(navigator.serviceWorker.controller)) throw new Error('当前页面由其他 Service Worker 控制，请先解决冲突')
    listen()
    const registration = existing || await navigator.serviceWorker.register(script.href, { scope: base.pathname, updateViaCache: 'none' })
    assertCurrent()
    await new Promise((resolve, reject) => {
      let interval
      let finished = false
      const finish = error => {
        if (finished) return
        finished = true; clearInterval(interval); navigator.serviceWorker.removeEventListener('controllerchange', check); attempt.cancelWait = null
        if (error) reject(error); else resolve()
      }
      const check = () => {
        try {
          assertCurrent()
          if (navigator.serviceWorker.controller && !owns(navigator.serviceWorker.controller)) finish(new Error('地图 Service Worker 控制器冲突'))
          else if (owns(navigator.serviceWorker.controller) && registration.active && registration.active.state === 'activated') finish()
        } catch (error) { finish(error) }
      }
      attempt.cancelWait = finish
      interval = setInterval(check, 100)
      navigator.serviceWorker.addEventListener('controllerchange', check)
      check()
    })
    assertCurrent()
  })()
  return Promise.race([work, deadline]).finally(() => { clearTimeout(timer); cancel() })
}

export async function syncMapWorkerAuth(config) {
  const host = normalizeMapServiceHost(config.serviceHost)
  if (expectedScript && serviceHost !== host) throw new Error('地图代理路径已变化，请刷新页面')
  serviceHost = host
  if (!preparing) {
    const attempt = prepareWorker().catch(error => { if (preparing === attempt) preparing = null; throw error })
    preparing = attempt
  }
  const attempt = preparing
  await attempt
  if (preparing !== attempt) throw new Error('地图 Service Worker 准备状态已变化，请重试')
  if (!isOwnController()) { preparing = null; throw new Error('地图 Service Worker 已失去控制，请重试') }
  const state = snapshot()
  await sendAuth(navigator.serviceWorker.controller, state)
  if (!state.token) throw new Error('请先登录')
}
