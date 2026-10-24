// 构建高德外部导航链接，并识别移动设备及微信、QQ 浏览器环境。
import { hasCoordinates } from './mapSearch'
export function buildAmapNavigationUrl({ start, destination, mode = 'car', callNative = false }) {
  if (!hasCoordinates(destination)) throw new Error('请先选择目的地')
  const params = new URLSearchParams()
  const value = point => `${Number(point.longitude)},${Number(point.latitude)},${point.name || ''}`
  if (hasCoordinates(start)) params.set('from', value(start))
  params.set('to', value(destination)); params.set('mode', mode); params.set('src', 'PivotHub')
  params.set('callnative', callNative ? '1' : '0'); params.set('coordinate', 'gaode')
  return `https://uri.amap.com/navigation?${params.toString()}`
}
export function browserNavigationContext() {
  const ua = navigator.userAgent
  return { mobile: /Android|iPhone|iPad|Mobile/i.test(ua), restricted: /MicroMessenger|\bQQ\//i.test(ua) }
}
