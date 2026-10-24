// 拦截高德 SDK 发往本项目地图代理接口的请求，携带用户 Token，并配合页面处理认证刷新与登录失效。
const PROTOCOL = 'pivot-map-proxy-v1'
const states = new Map()
const refreshes = new Map()
const scope = new URL(self.registration.scope)
const script = new URL(self.location.href)
const defaultHost = '/api/business/map/amap/_AMapService'
const proxyPath = normalizeHost(script.searchParams.get('proxy') || defaultHost)

function normalizeHost(value) {
  if (typeof value !== 'string' || !value || /[%\\;\s]/.test(value)) throw new Error('Invalid proxy path')
  const path = value.replace(/\/$/, '')
  if (path.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid proxy path')
  const url = new URL(path, self.location.origin)
  if (url.origin !== self.location.origin || url.search || url.hash || !url.pathname.endsWith('/_AMapService') || url.pathname.includes('//')) throw new Error('Invalid proxy path')
  return url.pathname
}

function denied() {
  return new Response(JSON.stringify({ code: 40301, msg: '地图登录状态已变化，请重新同步或登录', data: null }), { status: 401, headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Cache-Control': 'no-store' } })
}

async function controlledClient(id) {
  if (!id) return null
  const client = await self.clients.get(id)
  if (!client || client.type !== 'window') return null
  const url = new URL(client.url)
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return null
  const controlled = await self.clients.matchAll({ type: 'window', includeUncontrolled: false })
  return controlled.some(item => item.id === id) ? client : null
}

function applyAuth(id, data) {
  if (data.protocol !== PROTOCOL || !Number.isSafeInteger(data.generation) || data.generation < 0 || !Number.isSafeInteger(data.authVersion) || data.authVersion < 0 || typeof data.token !== 'string' || /[\r\n]/.test(data.token) || data.token.length > 8192 || normalizeHost(data.serviceHost) !== proxyPath) throw new Error('Invalid authentication')
  const previous = states.get(id)
  if (previous && (data.generation < previous.generation || data.authVersion < previous.authVersion)) throw new Error('Stale authentication')
  if (previous && data.generation === previous.generation && (data.authVersion !== previous.authVersion || data.token !== previous.token)) throw new Error('Stale authentication')
  const state = { token: data.token, generation: data.generation, authVersion: data.authVersion }
  states.set(id, state)
  return state
}

async function askPage(id, type, expected) {
  const client = await controlledClient(id)
  if (!client) throw new Error('Uncontrolled client')
  const channel = new MessageChannel()
  const reply = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Authentication timeout')) }, 8000)
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close()
      if (!event.data || event.data.ok !== true) reject(new Error('Authentication failed'))
      else resolve(event.data)
    }
    client.postMessage({ protocol: PROTOCOL, type, ...expected }, [channel.port2])
  })
  if (!await controlledClient(id)) throw new Error('Uncontrolled client')
  return applyAuth(id, reply)
}

function sameState(left, right) {
  return !!left && !!right && left.generation === right.generation && left.authVersion === right.authVersion && left.token === right.token
}

async function confirm(id, expected) {
  const state = await askPage(id, 'request-auth')
  if (!state.token || (expected && !sameState(state, expected))) throw new Error('Authentication changed')
  return state
}

async function refresh(id, state) {
  const existing = refreshes.get(id)
  if (existing && existing.authVersion === state.authVersion) return existing.promise
  const item = { authVersion: state.authVersion, promise: null }
  item.promise = askPage(id, 'refresh-auth', { authVersion: state.authVersion, generation: state.generation }).finally(() => { if (refreshes.get(id) === item) refreshes.delete(id) })
  refreshes.set(id, item)
  return item.promise
}

async function notifyInvalid(id, state) {
  const client = await controlledClient(id)
  if (client && sameState(state, states.get(id))) client.postMessage({ protocol: PROTOCOL, type: 'auth-invalid', authVersion: state.authVersion, generation: state.generation })
}

async function proxy(event, url) {
  try {
    let state = await confirm(event.clientId)
    for (let attempt = 0; attempt < 2; attempt++) {
      await confirm(event.clientId, state)
      const headers = new Headers({ Authorization: `Bearer ${state.token}` })
      const accept = event.request.headers.get('Accept')
      if (accept && accept.length <= 1024 && !/[\r\n]/.test(accept)) headers.set('Accept', accept)
      const upstream = await fetch(url.href, { method: 'GET', mode: 'same-origin', credentials: 'omit', headers, cache: 'no-store', redirect: 'error' })
      const bytes = await upstream.arrayBuffer()
      await confirm(event.clientId, state)
      const response = new Response(upstream.status === 204 || upstream.status === 205 || upstream.status === 304 ? null : bytes, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers })
      if (response.status !== 401) return response
      let body
      try { body = await response.clone().json() } catch (error) { body = null }
      if (body && body.code === 40302 && attempt === 0) {
        const renewed = await refresh(event.clientId, state)
        if (!renewed.token || renewed.authVersion !== state.authVersion) return denied()
        state = renewed
        continue
      }
      await notifyInvalid(event.clientId, state)
      return response
    }
  } catch (error) { return denied() }
  return denied()
}

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()) })
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()) })
self.addEventListener('message', event => {
  const data = event.data
  if (!data || data.protocol !== PROTOCOL || data.type !== 'sync-auth') return
  event.waitUntil((async () => {
    const port = event.ports[0]
    if (!port) return
    try {
      const client = event.source && await controlledClient(event.source.id)
      if (!client) throw new Error('Uncontrolled client')
      const state = applyAuth(client.id, data)
      port.postMessage({ ok: true, protocol: PROTOCOL, generation: state.generation, authVersion: state.authVersion })
    } catch (error) { port.postMessage({ ok: false, protocol: PROTOCOL }) }
    finally { port.close() }
  })())
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(proxyPath + '/')) return
  if (/[%\\;]/.test(url.pathname) || url.pathname.includes('//') || url.pathname.split('/').some(part => part === '.' || part === '..')) { event.respondWith(denied()); return }
  event.respondWith(proxy(event, url))
})
