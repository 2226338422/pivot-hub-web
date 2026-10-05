<template>
  <div class="role-management">
    <el-card shadow="never">
      <div class="page-heading">
        <div><h2>角色管理</h2><p>维护角色信息，为角色分配菜单访问权限。</p></div>
        <el-button type="primary" icon="el-icon-plus" @click="openCreate">新增角色</el-button>
      </div>
      <el-form :inline="true" :model="query" class="search-form" @submit.native.prevent="search">
        <el-form-item label="角色名称"><el-input v-model="query.name" clearable placeholder="请输入角色名称" @keyup.enter.native="search" /></el-form-item>
        <el-form-item label="角色编码"><el-input v-model="query.code" clearable placeholder="请输入角色编码" @keyup.enter.native="search" /></el-form-item>
        <el-form-item><el-button type="primary" icon="el-icon-search" @click="search">查询</el-button><el-button @click="resetQuery">重置</el-button></el-form-item>
      </el-form>
      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon class="error-alert" />
      <el-button v-if="loadError" type="text" @click="loadRoles">重新加载</el-button>
      <el-alert v-if="actionError" :title="actionError" type="error" show-icon class="error-alert" @close="actionError = ''" />
      <el-table v-loading="loading" :data="roles" border empty-text="暂无角色" class="role-table">
        <el-table-column prop="code" label="角色编码" min-width="140" show-overflow-tooltip />
        <el-table-column prop="name" label="角色名称" min-width="130" show-overflow-tooltip />
        <el-table-column label="默认角色" width="100" align="center"><template slot-scope="scope"><el-tag v-if="scope.row.defa === 1" size="small">默认</el-tag><span v-else>否</span></template></el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="更新时间" min-width="170"><template slot-scope="scope">{{ formatTime(scope.row.updateTime) }}</template></el-table-column>
        <el-table-column label="操作" width="350" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="text" @click="openPermissions(scope.row, true)">查看菜单权限</el-button>
            <el-button type="text" @click="openPermissions(scope.row)">修改菜单权限</el-button>
            <el-button type="text" class="delete-button" :disabled="scope.row.defa === 1 || deletingId === scope.row.uuid" @click="removeRole(scope.row)">{{ deletingId === scope.row.uuid ? '删除中' : '删除' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" background :current-page="query.pageNum" :page-size="query.pageSize" :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next" @current-change="changePage" @size-change="changeSize" />
    </el-card>
    <role-form-dialog :visible.sync="formVisible" :role-id="editingRoleId" @saved="loadRoles" />
    <role-menu-permission-dialog :visible.sync="permissionVisible" :role="permissionRole" :read-only="permissionReadOnly" @saved="loadRoles" />
  </div>
</template>

<script>
import { getRolePage, deleteRole } from '@/api/system/role'
import { getResultData } from '@/utils/result'
import RoleFormDialog from './RoleFormDialog.vue'
import RoleMenuPermissionDialog from './RoleMenuPermissionDialog.vue'

export default {
  name: 'RoleManagementView',
  components: { RoleFormDialog, RoleMenuPermissionDialog },
  data() {
    return { query: { name: '', code: '', pageNum: 1, pageSize: 10 }, roles: [], total: 0, loading: false,
      loadError: '', actionError: '', loadSeq: 0, deletingId: '', formVisible: false, editingRoleId: '',
      permissionVisible: false, permissionRole: null, permissionReadOnly: false, pageActive: true }
  },
  computed: { authVersion() { return this.$store.state.common.authVersion } },
  watch: {
    authVersion() { this.loadSeq += 1; this.roles = []; this.total = 0; this.loading = false; this.formVisible = false; this.permissionVisible = false }
  },
  created() { this.loadRoles() },
  beforeDestroy() { this.pageActive = false; this.loadSeq += 1 },
  methods: {
    async loadRoles() {
      const seq = ++this.loadSeq
      const authVersion = this.authVersion
      this.loading = true
      this.loadError = ''
      try {
        const page = getResultData(await getRolePage({ ...this.query }))
        if (seq !== this.loadSeq || authVersion !== this.authVersion) return
        if (!page || !Array.isArray(page.list) || typeof page.total !== 'number') throw new Error('角色列表数据格式不正确')
        this.roles = page.list
        this.total = page.total
        const lastPage = Math.max(1, Math.ceil(page.total / this.query.pageSize))
        if (this.query.pageNum > lastPage) { this.query.pageNum = lastPage; await this.loadRoles() }
      } catch (error) {
        if (seq === this.loadSeq && authVersion === this.authVersion && !error.authChanged) {
          this.roles = []
          this.total = 0
          this.loadError = (error.response && error.response.data && error.response.data.msg) || error.message || '角色加载失败'
        }
      } finally {
        if (seq === this.loadSeq && authVersion === this.authVersion) this.loading = false
      }
    },
    search() { this.query.pageNum = 1; this.loadRoles() },
    resetQuery() { this.query.name = ''; this.query.code = ''; this.search() },
    changePage(page) { this.query.pageNum = page; this.loadRoles() },
    changeSize(size) { this.query.pageSize = size; this.search() },
    openCreate() { this.editingRoleId = ''; this.formVisible = true },
    openEdit(role) { this.editingRoleId = role.uuid; this.formVisible = true },
    openPermissions(role, readOnly = false) { this.permissionRole = role; this.permissionReadOnly = readOnly; this.permissionVisible = true },
    async removeRole(role) {
      if (role.defa === 1 || this.deletingId) return
      const authVersion = this.authVersion
      try { await this.$confirm(`删除角色「${role.name}」后将不再可用，是否继续？`, '删除角色', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }) } catch (error) { return }
      if (!this.pageActive || authVersion !== this.authVersion || this.deletingId) return
      this.deletingId = role.uuid
      this.actionError = ''
      try {
        getResultData(await deleteRole(role.uuid))
        if (!this.pageActive || authVersion !== this.authVersion) return
        this.$message.success('角色已删除')
        await this.loadRoles()
      } catch (error) {
        if (this.pageActive && authVersion === this.authVersion && !error.authChanged) this.actionError = (error.response && error.response.data && error.response.data.msg) || error.message || '删除失败'
      } finally { this.deletingId = '' }
    },
    formatTime(value) {
      if (!value) return '—'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
    }
  }
}
</script>

<style scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.page-heading h2 { margin: 0 0 8px; color: #303133; }
.page-heading p { margin: 0; color: #909399; font-size: 14px; }
.search-form { margin-bottom: 4px; }
.error-alert { margin-bottom: 12px; }
.role-table { width: 100%; }
.pagination { margin-top: 20px; text-align: right; overflow-x: auto; }
.delete-button { color: #f56c6c; }
.delete-button.is-disabled { color: #c0c4cc; }
@media (max-width: 640px) { .page-heading { align-items: flex-start; flex-direction: column; } }
</style>
