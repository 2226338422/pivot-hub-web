<template>
  <div class="page-container">
    <el-card shadow="never">
      <div slot="header" class="card-header">
        <span class="card-title">菜单管理</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleAdd">新增菜单</el-button>
      </div>
      <el-table
        :data="tableData"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        v-loading="loading"
        border
        default-expand-all
      >
        <el-table-column prop="name" label="菜单名称" min-width="180" />
        <el-table-column prop="icon" label="图标" width="100" align="center">
          <template slot-scope="{ row }">
            <i :class="row.icon || 'el-icon-menu'" />
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" width="180" show-overflow-tooltip />
        <el-table-column prop="component" label="组件路径" width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.type === 1 ? 'primary' : row.type === 2 ? 'success' : 'info'" size="mini">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="mini">
              {{ row.status === 0 ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" @click="handleAddChild(row)">下级</el-button>
            <el-button type="text" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="text" size="small" class="text-danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="520px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="菜单类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :label="1">目录</el-radio>
            <el-radio :label="2">菜单</el-radio>
            <el-radio :label="3">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由路径" prop="path" v-if="form.type !== 3">
          <el-input v-model="form.path" placeholder="如：/system/users" />
        </el-form-item>
        <el-form-item label="组件路径" prop="component" v-if="form.type === 2">
          <el-input v-model="form.component" placeholder="如：@/views/System/ManageUser.vue" />
        </el-form-item>
        <el-form-item label="图标" v-if="form.type !== 3">
          <el-input v-model="form.icon" placeholder="Element UI 图标类名" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">显示</el-radio>
            <el-radio :label="1">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="父级菜单" v-if="!isEdit">
          <el-cascader
            v-model="form.parentIdArr"
            :options="parentOptions"
            :props="{ checkStrictly: true, value: 'id', label: 'name', emitPath: false }"
            placeholder="选择父级（不选则为顶级）"
            clearable
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'ManageMenu',
  data() {
    return {
      loading: false,
      submitLoading: false,
      tableData: [],
      dialogVisible: false,
      isEdit: false,
      isAddChild: false,
      form: {
        id: null, parentId: 0, type: 1, name: '', path: '', component: '',
        icon: '', sort: 0, status: 0
      },
      formRules: {
        type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
        name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }]
      },
      parentOptions: []
    }
  },
  computed: {
    dialogTitle() {
      if (this.isAddChild) return '新增下级菜单'
      if (this.isEdit) return '编辑菜单'
      return '新增菜单'
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    typeLabel(type) {
      const map = { 1: '目录', 2: '菜单', 3: '按钮' }
      return map[type] || '-'
    },
    async fetchList() {
      this.loading = true
      try {
        // TODO: 替换为实际菜单 API
        // const res = await getMenuList()
        // this.tableData = res.data.data || []
        this.tableData = [] // 待后端完善后填充
      } finally {
        this.loading = false
      }
    },
    buildParentOptions(list) {
      // 递归构建级联选择器选项（排除自身和子节点）
      const filter = (nodes, excludeId) => {
        return nodes.filter(n => n.id !== excludeId).map(n => {
          const child = n.children && filter(n.children, excludeId)
          return { ...n, children: child && child.length ? child : undefined }
        })
      }
      this.parentOptions = filter(list, this.form.id)
    },
    handleAdd() {
      this.isEdit = false
      this.isAddChild = false
      this.form = { id: null, parentId: 0, type: 1, name: '', path: '', component: '', icon: '', sort: 0, status: 0 }
      this.buildParentOptions(this.tableData)
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    handleAddChild(row) {
      this.isAddChild = true
      this.isEdit = false
      this.form = { id: null, parentId: row.id, type: 2, name: '', path: '', component: '', icon: '', sort: 0, status: 0 }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    handleEdit(row) {
      this.isEdit = true
      this.isAddChild = false
      this.form = { ...row }
      this.buildParentOptions(this.tableData)
      this.dialogVisible = true
    },
    async handleDelete(row) {
      try {
        await this.$confirm(`确定删除菜单「${row.name}」及其子菜单吗？`, '提示', { type: 'warning' })
        // TODO: 调用后端删除接口
        this.$message.success('删除成功')
        this.fetchList()
      } catch (e) {
        if (e !== 'cancel') throw e
      }
    },
    handleSubmit() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        this.submitLoading = true
        try {
          // TODO: 调用后端新增/修改接口
          this.$message.success(this.isEdit ? '修改成功' : '新增成功')
          this.dialogVisible = false
          this.fetchList()
        } finally {
          this.submitLoading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 500; }
.text-danger { color: #f56c6c; }
</style>
