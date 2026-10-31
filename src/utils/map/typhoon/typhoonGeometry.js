export function hasPosition(point) {
  return (
    !!point &&
    point.longitude != null &&
    point.latitude != null &&
    point.longitude !== '' &&
    point.latitude !== '' &&
    Number.isFinite(Number(point.longitude)) &&
    Number.isFinite(Number(point.latitude)) &&
    Math.abs(Number(point.longitude)) <= 180 &&
    Math.abs(Number(point.latitude)) <= 90
  )
}
export function toMapPosition(point) {
  const x = Number(point.longitude)
  const y = Number(point.latitude)
  if (x < 72.004 || x > 137.8347 || y < 0.8293 || y > 55.8271) return [x, y]
  const lng = x - 105
  const lat = y - 35
  const pi = Math.PI
  let dlat =
    -100 + 2 * lng + 3 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  dlat += ((20 * Math.sin(6 * lng * pi) + 20 * Math.sin(2 * lng * pi)) * 2) / 3
  dlat += ((20 * Math.sin(lat * pi) + 40 * Math.sin((lat / 3) * pi)) * 2) / 3
  dlat += ((160 * Math.sin((lat / 12) * pi) + 320 * Math.sin((lat * pi) / 30)) * 2) / 3
  let dlng =
    300 + lng + 2 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  dlng += ((20 * Math.sin(6 * lng * pi) + 20 * Math.sin(2 * lng * pi)) * 2) / 3
  dlng += ((20 * Math.sin(lng * pi) + 40 * Math.sin((lng / 3) * pi)) * 2) / 3
  dlng += ((150 * Math.sin((lng / 12) * pi) + 300 * Math.sin((lng / 30) * pi)) * 2) / 3
  const rad = (y / 180) * pi
  const magic = 1 - 0.006693421622965943 * Math.sin(rad) ** 2
  dlat = (dlat * 180) / (((6378245 * (1 - 0.006693421622965943)) / (magic * Math.sqrt(magic))) * pi)
  dlng = (dlng * 180) / ((6378245 / Math.sqrt(magic)) * Math.cos(rad) * pi)
  return [x + dlng, y + dlat]
}
export function splitTrack(points) {
  const paths = []
  let path = []
  points.forEach((point) => {
    if (!hasPosition(point)) {
      if (path.length) paths.push(path)
      path = []
      return
    }
    const position = toMapPosition(point)
    if (path.length && Math.abs(position[0] - path[path.length - 1][0]) > 180) {
      paths.push(path)
      path = []
    }
    path.push(position)
  })
  if (path.length) paths.push(path)
  return paths
}
export function windCirclePaths(point, circle) {
  if (!hasPosition(point) || !circle) return []
  const radii = ['northeast', 'southeast', 'southwest', 'northwest'].map((key) => circle[key])
  if (
    radii.some(
      (radius) =>
        radius == null || radius === '' || !Number.isFinite(Number(radius)) || Number(radius) < 0
    ) ||
    !radii.some((radius) => Number(radius) > 0)
  )
    return []
  const rad = Math.PI / 180
  const lat = Number(point.latitude) * rad
  const lng = Number(point.longitude)
  const polygon = []
  radii.forEach((radius, quadrant) => {
    for (let step = 0; step <= 18; step++) {
      const bearing = (quadrant * 90 + step * 5) * rad
      const distance = Number(radius) / 6371.0088
      const nextLat = Math.asin(
        Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing)
      )
      const nextLng =
        lng +
        Math.atan2(
          Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
          Math.cos(distance) - Math.sin(lat) * Math.sin(nextLat)
        ) /
          rad
      polygon.push([nextLng, nextLat / rad])
    }
  })
  const clip = (points, edge, greater) => {
    const output = []
    points.forEach((current, index) => {
      const previous = points[(index + points.length - 1) % points.length]
      const inside = greater ? current[0] >= edge : current[0] <= edge
      const wasInside = greater ? previous[0] >= edge : previous[0] <= edge
      if (inside !== wasInside)
        output.push([
          edge,
          previous[1] +
            ((current[1] - previous[1]) * (edge - previous[0])) / (current[0] - previous[0])
        ])
      if (inside) output.push(current)
    })
    return output
  }
  return [-360, 0, 360]
    .map((shift) =>
      clip(
        clip(
          polygon.map((p) => [p[0] + shift, p[1]]),
          -180,
          true
        ),
        180,
        false
      )
    )
    .filter((path) => path.length >= 3)
    .map((path) => path.map((p) => toMapPosition({ longitude: p[0], latitude: p[1] })))
}
