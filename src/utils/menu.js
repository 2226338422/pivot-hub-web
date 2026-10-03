import { registeredMenuPaths } from '@/router/menuRoutes'

export function normalizeMenuPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
  return path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
}

export function normalizeMenuTree(nodes) {
  return nodes.reduce((result, node) => {
    if (!node || typeof node !== 'object' || !node.uuid) throw new Error('菜单数据格式不正确')
    const children = normalizeMenuTree(Array.isArray(node.children) ? node.children : [])
    const path = normalizeMenuPath(node.webUrl)
    const webUrl = registeredMenuPaths.has(path) ? path : null
    if (webUrl || children.length) result.push({ ...node, webUrl, children })
    return result
  }, [])
}

export function getAllowedPaths(tree) {
  const paths = new Set()
  const visit = nodes => nodes.forEach(node => {
    if (node.webUrl) paths.add(node.webUrl)
    visit(node.children)
  })
  visit(tree)
  return paths
}

export function getDefaultMenuPath(tree) {
  const paths = getAllowedPaths(tree)
  return paths.has('/home') ? '/home' : (paths.values().next().value || null)
}

export function getLoginTarget(tree, redirect) {
  const path = normalizeMenuPath(redirect)
  if (registeredMenuPaths.has(path) && getAllowedPaths(tree).has(path)) return redirect
  return getDefaultMenuPath(tree) || { path: '/access-state', query: { kind: 'empty' } }
}
