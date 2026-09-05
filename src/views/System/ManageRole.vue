<template>
  <div class="page-container">
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="角色名称">
          <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div slot="header" class="table-header">
        <span class="table-title">角色列表</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAdd">新增角色</el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="roleName" label="角色名称" width="150" />
        <el-table-column prop="roleCode" label="角色编码" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="text" size="small" @click="handleAssignMenu(row)">分配菜单</el-button>
            <el-button type="text" size="small" class="text-danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :page-size="queryParams.size"
        :current-page="queryParams.page"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
        style="margin-top: 20px; text-align: right;"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="480px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" :disabled="isEdit" placeholder="请输入角色编码（唯一）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>

    <!-- 分配菜单弹窗 -->
    <el-dialog title="分配菜单" :visible.sync="menuDialogVisible" width="420px" append-to-body>
      <el-tree
        ref="menuTree"
        :data="allMenus"
        :props="{ label: 'label', children: 'children' }"
        node-key="id"
        show-checkbox
        default-expand-all
      />
      <span slot="footer">
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuLoading" @click="handleConfirmMenu">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getRoleList, addRole, updateRole, deleteRole } from '@/api/system/role'
import { getMenuTree } from '@/api/system/menu'

export default {
  name: 'ManageRole',
  data() {
    return {
      loading: false,
      submitLoading: false,
      tableData: [],
      total: 0,
      queryParams: { page: 1, size: 10, roleName: '' },
      dialogVisible: false,
      isEdit: false,
      form: { id: null, roleName: '', roleCode: '', description: '' },
      formRules: {
        roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
        roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
      },
      // 分配菜单相关
      allMenus: [],
      menuDialogVisible: false,
      menuLoading: false,
      currentRoleId: null,
      checkedMenuIds: []
    }
  },
  computed: {
    dialogTitle() {
      return this.isEdit ? '编辑角色' : '新增角色'
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.loading = true
      try {
        const res = await getRoleList(this.queryParams.page, this.queryParams.size)
        if (res.data.code === 201 || res.data.code === 200) {
          const page = res.data.data
          this.tableData = page.records || []
          this.total = Number(page.total) || 0
        }
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.queryParams.page = 1
      this.fetchList()
    },
    handleReset() {
      this.queryParams = { page: 1, size: 10, roleName: '' }
      this.fetchList()
    },
    handlePageChange(page) {
      this.queryParams.page = page
      this.fetchList()
    },
    handleSizeChange(size) {
      this.queryParams.size = size
      this.queryParams.page = 1
      this.fetchList()
    },
    handleAdd() {
      this.isEdit = false
      this.form = { id: null, roleName: '', roleCode: '', description: '' }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    handleEdit(row) {
      this.isEdit = true
      this.form = { ...row }
      this.dialogVisible = true
    },
    async handleDelete(row) {
      try {
        await this.$confirm(`确定删除角色「${row.roleName}」吗？`, '提示', { type: 'warning' })
        const res = await deleteRole(row.id)
        if (res.data.code === 201 || res.data.code === 200) {
          this.$message.success('删除成功')
          this.fetchList()
        }
      } catch (e) {
        if (e !== 'cancel') throw e
      }
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        this.submitLoading = true
        try {
          const fn = this.isEdit ? updateRole : addRole
          const res = await fn(this.form)
          if (res.data.code === 201 || res.data.code === 200) {
            this.$message.success(this.isEdit ? '修改成功' : '新增成功')
            this.dialogVisible = false
            this.fetchList()
          }
        } finally {
          this.submitLoading = false
        }
      })
    },
    // 分配菜单
    async handleAssignMenu(row) {
      this.currentRoleId = row.id
      this.checkedMenuIds = [] // TODO: 根据 roleId 加载已分配菜单
      try {
        const res = await getMenuTree(0) // 传 0 或 -1 表示获取全部菜单树
        if (res.data.code === 201 || res.data.code === 200) {
          this.allMenus = res.data.data || []
        }
      } catch (e) {}
      this.menuDialogVisible = true
    },
    async handleConfirmMenu() {
      this.menuLoading = true
      try {
        const checkedKeys = this.$refs.menuTree.getCheckedKeys()
        const halfCheckedKeys = this.$refs.menuTree.getHalfCheckedKeys()
        const allKeys = [...checkedKeys, ...halfCheckedKeys]
        // TODO: 调用后端接口保存 role → menus 关系
        this.$message.success('分配成功')
        this.menuDialogVisible = false
      } finally {
        this.menuLoading = false
      }
    }
  }
}
</script>

<style scoped>
.search-card { margin-bottom: 16px; }
.table-header { display: flex; justify-content: space-between; align-items: center; }
.table-title { font-size: 15px; font-weight: 500; }
.text-danger { color: #f56c6c; }
</style>
