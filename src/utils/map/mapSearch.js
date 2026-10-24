// 封装地址候选查询、地点详情解析、地址格式化及经纬度校验与转换。
import { searchTips, searchPois, poiDetail } from '@/api/business/map'
export function hasCoordinates(point) {
  return point && point.longitude !== undefined && point.latitude !== undefined && point.longitude !== null && point.latitude !== null && point.longitude !== '' && point.latitude !== '' &&
    Number.isFinite(Number(point.longitude)) && Number.isFinite(Number(point.latitude)) && Math.abs(Number(point.longitude)) <= 180 && Math.abs(Number(point.latitude)) <= 90
}
export const coordinates = point => [Number(point.longitude), Number(point.latitude)]
export function displayAddress(point) {
  const address = typeof point.address === 'string' ? point.address.trim() : ''
  const district = typeof point.district === 'string' ? point.district.trim() : ''
  return district && !address.startsWith(district) ? `${district}${address}` : address
}
export async function findAddresses(keyword, city) {
  const tips = await searchTips({ keyword, city })
  if (tips && tips.length) return tips
  const result = await searchPois({ keyword, city, pageNum: 1, pageSize: 20 })
  return result.list || []
}
export async function resolveAddress(item) {
  const poiId = item.poiId || item.amapPoiId || null
  let point = item
  if (poiId) {
    point = await poiDetail(poiId)
    if (!hasCoordinates(point) || !point.name || !point.name.trim()) throw new Error('未取得此地点的完整详情，请重新选择具体地点')
  }
  if (!hasCoordinates(point)) throw new Error('此建议没有具体坐标，请选择具体地点或在地图上选点')
  return { ...point, name: point.name || '地图选点', address: displayAddress(point), longitude: Number(point.longitude), latitude: Number(point.latitude), source: poiId ? 1 : 0, amapPoiId: poiId, poiId }
}
