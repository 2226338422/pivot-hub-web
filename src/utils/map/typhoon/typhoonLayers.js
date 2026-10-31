// 创建台风实况点、实况路径、虚线预报路径和四象限风圈并统一释放事件。
// 创建台风实况点、实况路径、虚线预报路径和四象限风圈并统一释放事件。
import { hasPosition, toMapPosition, splitTrack, windCirclePaths } from './typhoonGeometry'
// 创建台风实况点、实况路径、虚线预报路径和四象限风圈并统一释放事件。
import { levelColor, formatTime } from './typhoonFormat'
export function createTyphoonLayers(AMap, map, detail, selected, enabled, onSelect) {
  const overlays = []
  const listeners = []
  const add = (overlay) => {
    overlays.push(overlay)
    return overlay
  }
  const observations = (detail && detail.observations) || []
  const current =
    observations.filter(hasPosition).slice(-1)[0] ||
    (detail && hasPosition(detail.typhoon) ? detail.typhoon : null)
  if (current) {
    const button = document.createElement('button')
    button.type = 'button'
    button.style.cssText =
      'display:flex;align-items:center;gap:8px;background:white;border:1px solid #ccdae8;border-radius:18px;padding:6px 11px;box-shadow:0 2px 10px #24456835;cursor:pointer;color:#30445d;white-space:nowrap'
    const symbol = document.createElement('span')
    symbol.textContent = '◉'
    symbol.style.cssText = `font-size:24px;line-height:24px;color:${levelColor(current.level)}`
    const label = document.createElement('span')
    label.textContent = `${(detail.typhoon && detail.typhoon.name) || '台风'} · ${
      current.level || '强度未提供'
    }`
    button.appendChild(symbol)
    button.appendChild(label)
    button.title = `当前台风中心 ${formatTime(current.time || current.observedAt)}`
    button.setAttribute('aria-label', button.title)
    const marker = add(
      new AMap.Marker({
        position: toMapPosition(current),
        content: button,
        anchor: 'center',
        zIndex: 200,
        bubble: false
      })
    )
    const click = (event) => {
      if (event && event.stopPropagation) event.stopPropagation()
      onSelect(current)
    }
    button.addEventListener('click', click)
    marker.on('click', click)
    listeners.push(() => {
      button.removeEventListener('click', click)
      marker.off('click', click)
    })
  }
  if (enabled.observed) {
    splitTrack(observations)
      .filter((path) => path.length > 1)
      .forEach((path) =>
        add(new AMap.Polyline({ path, strokeColor: '#287bd0', strokeWeight: 3, zIndex: 70 }))
      )
    observations.filter(hasPosition).forEach((point) => {
      const button = document.createElement('button')
      button.type = 'button'
      const active = selected && point.time === selected.time
      button.style.cssText = `width:${active ? 18 : 11}px;height:${
        active ? 18 : 11
      }px;border:2px solid white;border-radius:50%;background:${levelColor(
        point.level
      )};box-shadow:0 0 0 ${active ? 3 : 1}px #234b7180;cursor:pointer;padding:0`
      button.title = `查看实况 ${formatTime(point.time)}`
      button.setAttribute('aria-label', button.title)
      const marker = add(
        new AMap.Marker({
          position: toMapPosition(point),
          content: button,
          anchor: 'center',
          zIndex: active ? 150 : 100,
          bubble: false
        })
      )
      const click = (event) => {
        if (event && event.stopPropagation) event.stopPropagation()
        onSelect(point)
      }
      button.addEventListener('click', click)
      marker.on('click', click)
      listeners.push(() => {
        button.removeEventListener('click', click)
        marker.off('click', click)
      })
    })
  }
  const forecast = detail && detail.forecast
  if (enabled.forecast && forecast) {
    const issued = forecast.issuedAt && new Date(forecast.issuedAt).getTime()
    const anchor = issued
      ? observations.find((point) => new Date(point.time).getTime() === issued)
      : null
    const points = anchor ? [anchor, ...(forecast.points || [])] : forecast.points || []
    splitTrack(points)
      .filter((path) => path.length > 1)
      .forEach((path) =>
        add(
          new AMap.Polyline({
            path,
            strokeColor: '#e59b31',
            strokeWeight: 3,
            strokeStyle: 'dashed',
            zIndex: 65
          })
        )
      )
    ;(forecast.points || []).filter(hasPosition).forEach((point) =>
      add(
        new AMap.Marker({
          position: toMapPosition(point),
          content: forecastDot(),
          anchor: 'center',
          zIndex: 80,
          title: `预报 ${formatTime(point.time)}`
        })
      )
    )
  }
  if (enabled.wind && selected)
    (selected.windCircles || []).forEach((circle) => {
      const colors = { 7: '#6bb4e8', 10: '#f0b64a', 12: '#ed7272' }
      windCirclePaths(selected, circle).forEach((path) =>
        add(
          new AMap.Polygon({
            path,
            fillColor: colors[circle.level] || '#6bb4e8',
            fillOpacity: 0.16,
            strokeColor: colors[circle.level] || '#6bb4e8',
            strokeWeight: 1,
            zIndex: 30,
            bubble: true
          })
        )
      )
    })
  map.add(overlays)
  return {
    overlays,
    destroy() {
      listeners.forEach((remove) => remove())
      map.remove(overlays)
    }
  }
}
function forecastDot() {
  const dot = document.createElement('span')
  dot.style.cssText =
    'display:block;width:8px;height:8px;background:white;border:2px solid #e59b31;border-radius:50%'
  return dot
}
