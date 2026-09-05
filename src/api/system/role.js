import request from '@/utils/request'

/**
 * 分页查询角色列表
 * @param {number} page - 页码，默认 1
 * @param {number} size - 每页条数，默认 10
 */
export const getRoleList = (page = 1, size = 10) => {
  return request.get('/system/role/list', { params: { page, size } })
}

/**
 * 新增角色
 * @param {Object} role - SysRole 对象
 */
export const addRole = (role) => {
  return request.post('/system/role', role)
}

/**
 * 修改角色
 * @param {Object} role - SysRole 对象
 */
export const updateRole = (role) => {
  return request.put('/system/role', role)
}

/**
 * 删除角色
 * @param {number} id - 角色 ID
 */
export const deleteRole = (id) => {
  return request.delete(`/system/role/${id}`)
}
