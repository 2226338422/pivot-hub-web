import request from '@/utils/request'
import { getResultData } from '@/utils/result'
const root = '/business/map'
const get = (path, params, options) =>
  request.get(root + path, { params, silentError: true, ...options }).then(getResultData)
const post = (path, data, options) =>
  request.post(root + path, data, { silentError: true, ...options }).then(getResultData)
export const getRuntimeMapConfig = () =>
  request.get(root + '/amap/config', { silentError: true }).then((response) => {
    const config = getResultData(response)
    Object.defineProperty(config, '_requestToken', { value: response.config._authToken })
    return config
  })
export const getMapCity = () => get('/amap/city', undefined, { timeout: 8000 })
export const listMapCities = () => get('/amap/cities')
export const searchTips = (params) => get('/amap/searchTips', params)
export const searchPois = (params) => get('/amap/searchPois', params)
export const poiDetail = (poiId) => get('/amap/poiDetail', { poiId })
export const reverseGeocode = (params) => get('/amap/reverseGeocode', params)
export const requestRoute = (data) => post('/amap/route', data)
