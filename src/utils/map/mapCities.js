// 按登录会话缓存城市列表请求，并提供城市数据校验、去重、分组与筛选。
import store from '@/store'
import { listMapCities } from '@/api/business/map'

let cache = null

export function getMapCitySession() {
  const { authVersion, token } = store.state.common
  return `${authVersion}:${Boolean(token)}`
}

let session = getMapCitySession()
store.subscribe(() => {
  const next = getMapCitySession()
  if (next !== session) { session = next; cache = null }
})

function authChangedError() {
  const error = new Error('登录状态已变化')
  error.authChanged = true
  return error
}

export function loadMapCities() {
  const capturedSession = getMapCitySession()
  if (!store.state.common.token) return Promise.reject(authChangedError())
  if (cache && cache.session === capturedSession) return cache.promise
  const entry = { session: capturedSession, promise: null }
  cache = entry
  entry.promise = Promise.resolve().then(() => {
    if (getMapCitySession() !== capturedSession) throw authChangedError()
    return listMapCities()
  }).then(cities => {
    if (getMapCitySession() !== capturedSession) throw authChangedError()
    if (!Array.isArray(cities) || !cities.length) throw new Error('城市列表暂不可用')
    return cities
  }).catch(error => {
    if (cache === entry) cache = null
    throw error
  })
  return entry.promise
}

export function groupMapCities(cities, query = '') {
  const groups = new Map()
  const seen = new Set()
  const keyword = query.trim().toLowerCase()
  cities.forEach(city => {
    if (!city || typeof city.name !== 'string' || !city.name.trim() ||
        typeof city.province !== 'string' || !city.province.trim() ||
        typeof city.adcode !== 'string' || !/^\d{6}$/.test(city.adcode) || seen.has(city.adcode)) return
    seen.add(city.adcode)
    const parentCity = typeof city.parentCity === 'string' ? city.parentCity.trim() : ''
    if (keyword && !`${city.province} ${city.name} ${parentCity}`.toLowerCase().includes(keyword)) return
    const label = parentCity && parentCity !== city.name && parentCity !== city.province
      ? `${city.name}（${parentCity}）` : city.name
    if (!groups.has(city.province)) groups.set(city.province, { province: city.province, cities: [] })
    groups.get(city.province).cities.push({ adcode: city.adcode, label })
  })
  return Array.from(groups.values())
}
