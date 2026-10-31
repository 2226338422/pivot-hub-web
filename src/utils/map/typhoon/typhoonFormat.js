// 格式化台风时间、数值和强度颜色。
export const LEVELS = {
  TD: '#7bb94b',
  TS: '#409eff',
  STS: '#e6b23c',
  TY: '#f08b36',
  STY: '#ec5863',
  SuperTY: '#a765d1'
}
export function levelColor(level) {
  return LEVELS[level] || '#437fb7'
}
export function formatValue(value, unit = '') {
  return value == null || value === '' ? '—' : `${value}${unit ? ' ' + unit : ''}`
}
export function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
}
