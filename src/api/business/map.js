import request from '@/utils/request'
import { getResultData } from '@/utils/result'
const root = '/business/map'
const get = (path, params, options) => request.get(root + path, { params, silentError: true, ...options }).then(getResultData)
const post = (path, data, options) => request.post(root + path, data, { silentError: true, ...options }).then(getResultData)
export const listThemes = () => get('/theme/list')
export const getTheme = themeId => get('/theme/detail', { themeId })
export const saveTheme = data => post(data.themeId ? '/theme/update' : '/theme/add', data)
export const deleteTheme = themeId => post('/theme/delete', { themeId })
export const listCategories = themeId => get('/category/list', { themeId })
export const saveCategory = data => post(data.categoryId ? '/category/update' : '/category/add', data)
export const deleteCategory = categoryId => post('/category/delete', { categoryId })
export const pagePoints = params => get('/point/page', params)
export const listMarkers = params => get('/point/markers', params)
export const getPoint = pointId => get('/point/detail', { pointId })
export const savePoint = data => post(data.pointId ? '/point/update' : '/point/add', data)
export const deletePoint = pointId => post('/point/delete', { pointId })
export const getRuntimeMapConfig = () => request.get(root + '/amap/config', { silentError: true }).then(response => {
  const config = getResultData(response)
  Object.defineProperty(config, '_requestToken', { value: response.config._authToken })
  return config
})
export const getMapCity = () => get('/amap/city', undefined, { timeout: 8000 })
export const listMapCities = () => get('/amap/cities')
export const searchTips = params => get('/amap/searchTips', params)
export const searchPois = params => get('/amap/searchPois', params)
export const poiDetail = poiId => get('/amap/poiDetail', { poiId })
export const reverseGeocode = params => get('/amap/reverseGeocode', params)
export const requestRoute = data => post('/amap/route', data)
