import request from '@/utils/request'

/**
 * 分页查询用户列表
 * @param {number} page - 页码，默认 1
 * @param {number} size - 每页条数，默认 10
 */
export const getUserList = (page = 1, size = 10) => {
  return request.get('/system/user/list', { params: { page, size } })
}

/**
 * 新增用户
 * @param {Object} user - SysUser 对象
 */
export const addUser = (user) => {
  return request.post('/system/user', user)
}

/**
 * 修改用户
 * @param {Object} user - SysUser 对象
 */
export const updateUser = (user) => {
  return request.put('/system/user', user)
}

/**
 * 删除用户
 * @param {number} id - 用户 ID
 */
export const deleteUser = (id) => {
  return request.delete(`/system/user/${id}`)
}
