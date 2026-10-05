import request from '@/utils/request'

export const getRolePage = params => request.get('/system/role/page', { params })
export const getRoleDetail = roleId => request.get('/system/role/detail', { params: { roleId } })
export const addRole = data => request.post('/system/role/add', data)
export const updateRole = data => request.put('/system/role/update', data)
export const deleteRole = roleId => request.delete('/system/role/delete', { params: { roleId } })
export const getRoleMenuIds = roleId => request.get('/system/role/getMenuIds', { params: { roleId } })
export const saveRoleMenuPermissions = data => request.put('/system/role/saveMenuPermissions', data)
