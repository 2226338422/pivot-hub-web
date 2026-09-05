import request from '@/utils/request'

/**
 * 管理员登录
 * @param {Object} params - { username, password }
 */
export const login = (params) => {
  return request.post('/system/auth/login', params)
}

/**
 * 退出登录
 */
export const logout = () => {
  return request.post('/system/auth/logout')
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = () => {
  return request.get('/system/auth/current')
}
