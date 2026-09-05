import request from '@/utils/request'

/**
 * 查询菜单树
 * @param {number} userId - 用户 ID
 */
export const getMenuTree = (userId) => {
  return request.get(`/system/menu/tree/${userId}`)
}

/**
 * 根据角色 ID 查询菜单 ID 列表
 * @param {number} roleId - 角色 ID
 */
export const getMenuIdsByRole = (roleId) => {
  return request.get(`/system/menu/role/${roleId}`)
}
