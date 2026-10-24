// 请求后端路线规划接口，并提供高德地图路线折线的绘制与清除能力。
import { requestRoute } from '@/api/business/map'
export const planRoute = params => requestRoute(params)
export function renderRoute(map, result, AMap) {
  const lines = (result.paths || []).filter(path => path.coordinates && path.coordinates.length > 1).map(path => new AMap.Polyline({
    path: path.coordinates, strokeColor: path.kind === 'walk' ? '#38a169' : '#3478f6', strokeWeight: 6,
    strokeOpacity: 0.85, strokeStyle: path.kind === 'walk' ? 'dashed' : 'solid', bubble: true
  }))
  map.add(lines)
  if (lines.length) map.setFitView(lines, false, [70, 70, 70, 70])
  return { clear() { map.remove(lines) } }
}
