<template>
  <el-dialog :title="`${readOnly ? '查看菜单权限' : '修改菜单权限'} — ${role ? role.name : ''}`" :visible="visible" width="660px" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" :before-close="beforeClose" @update:visible="$emit('update:visible', $event)">
    <el-alert v-if="!readOnly" title="勾选说明" description="勾选或取消父菜单，会同步选择或取消全部可用子菜单；部分子菜单被选中时，父菜单显示半选。" type="info" :closable="false" show-icon class="permission-hint" />
    <el-alert v-if="!readOnly" title="保存说明" description="不会额外授予未选中的子菜单" type="info" :closable="false" show-icon class="permission-hint" />
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon class="permission-hint" />
    <el-button v-if="loadError" type="text" @click="loadPermissions">重新加载</el-button>
    <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon class="permission-hint" />
    <div v-loading="loading || saving" class="tree-container">
      <el-tree v-if="loaded" ref="permissionTree" :data="menuTree" :show-checkbox="!readOnly" node-key="uuid" :check-strictly="false" default-expand-all :props="treeProps">
        <span slot-scope="{ data }" class="tree-node"><span><i :class="data.icon || 'el-icon-menu'"></i>{{ data.menuName }}</span><el-tag v-if="readOnly" :type="grantedMenuIds.includes(data.uuid) ? 'success' : 'info'" size="mini">{{ grantedMenuIds.includes(data.uuid) ? '已授权' : '未授权' }}</el-tag><el-tag v-if="data.status === 0" type="info" size="mini">已禁用</el-tag></span>
      </el-tree>
      <el-empty v-if="loaded && !menuTree.length" description="暂无菜单" :image-size="80" />
    </div>
    <span slot="footer"><el-button :disabled="saving" @click="close">{{ readOnly ? '关闭' : '取消' }}</el-button><el-button v-if="!readOnly" type="primary" :loading="saving" :disabled="!loaded || loading || !!loadError" @click="save">保存</el-button></span>
  </el-dialog>
</template>

<script>
import { getAllMenuTree } from '@/api/system/menu'
import { getRoleMenuIds, saveRoleMenuPermissions } from '@/api/system/role'
import { getResultData } from '@/utils/result'

export default {
  name: 'RoleMenuPermissionDialog',
  props: { visible: Boolean, role: { type: Object, default: null }, readOnly: Boolean },
  data() {
    return { loading: false, loaded: false, saving: false, loadError: '', saveError: '', menuTree: [], grantedMenuIds: [],
      loadSeq: 0, loadingRoleId: '', loadingAuthVersion: null,
      treeProps: { label: 'menuName', children: 'children', disabled: data => this.readOnly || this.saving || data.disabled } }
  },
  computed: {
    roleId() { return this.role ? this.role.uuid : '' },
    authVersion() { return this.$store.state.common.authVersion }
  },
  watch: {
    visible(value) { if (value) this.loadPermissions(); else this.invalidate() },
    roleId() { if (this.visible) this.loadPermissions() },
    readOnly() { if (this.visible && this.loaded) { this.invalidate(); this.loadPermissions() } },
    authVersion() { this.invalidate(); this.$emit('update:visible', false) }
  },
  beforeDestroy() { this.invalidate() },
  methods: {
    invalidate() { this.loadSeq += 1; this.loading = false; this.loaded = false; this.saving = false; this.menuTree = []; this.grantedMenuIds = [] },
    isCurrent(seq, authVersion, roleId) { return seq === this.loadSeq && this.visible && authVersion === this.authVersion && roleId === this.roleId },
    getMenuNodes() {
      const nodes = new Map()
      const pending = this.menuTree.map(node => ({ node, parentId: null, depth: 0 }))
      while (pending.length) {
        const { node, parentId, depth } = pending.pop()
        if (!node || typeof node.uuid !== 'string' || nodes.has(node.uuid) || !Array.isArray(node.children)) throw new Error('菜单树数据格式不正确')
        nodes.set(node.uuid, { node, parentId, depth })
        pending.push(...node.children.map(child => ({ node: child, parentId: node.uuid, depth: depth + 1 })))
      }
      return nodes
    },
    applyGrantedKeys(ids) {
      const nodes = this.getMenuNodes()
      this.grantedMenuIds = [...new Set(ids)].filter(id => nodes.has(id))
      if (this.readOnly) return
      const grantedAncestors = new Set()
      this.grantedMenuIds.forEach(id => {
        let parentId = nodes.get(id).parentId
        while (parentId) { grantedAncestors.add(parentId); parentId = nodes.get(parentId).parentId }
      })
      const tree = this.$refs.permissionTree
      tree.setCheckedKeys([])
      this.grantedMenuIds.map(id => nodes.get(id)).sort((a, b) => b.depth - a.depth).forEach(({ node }) => {
        // 回显不下推授权；已有子级的父级由联动计算勾选或半选。
        if (!grantedAncestors.has(node.uuid)) tree.setChecked(node.uuid, true, false)
      })
    },
    async loadPermissions() {
      if (!this.roleId) { this.loaded = false; this.loadError = '请选择角色'; return }
      if (this.loading && this.loadingRoleId === this.roleId && this.loadingAuthVersion === this.authVersion) return
      const seq = ++this.loadSeq
      const roleId = this.roleId
      const authVersion = this.authVersion
      this.loading = true
      this.loadingRoleId = roleId
      this.loadingAuthVersion = authVersion
      this.loaded = false
      this.saving = false
      this.menuTree = []
      this.grantedMenuIds = []
      this.loadError = ''
      this.saveError = ''
      try {
        const [treeResponse, idsResponse] = await Promise.all([getAllMenuTree(), getRoleMenuIds(roleId)])
        if (!this.isCurrent(seq, authVersion, roleId)) return
        const tree = getResultData(treeResponse)
        const ids = getResultData(idsResponse)
        if (!Array.isArray(tree) || !Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('菜单权限数据格式不正确')
        this.menuTree = tree
        this.loaded = true
        await this.$nextTick()
        if (!this.isCurrent(seq, authVersion, roleId)) return
        this.applyGrantedKeys(ids)
      } catch (error) {
        if (this.isCurrent(seq, authVersion, roleId) && !error.authChanged) {
          this.loaded = false
          this.loadError = (error.response && error.response.data && error.response.data.msg) || error.message || '菜单权限加载失败'
        }
      } finally { if (this.isCurrent(seq, authVersion, roleId)) this.loading = false }
    },
    async save() {
      if (this.readOnly || this.saving || this.loading || !this.loaded || !this.$refs.permissionTree) return
      const seq = this.loadSeq
      const roleId = this.roleId
      const authVersion = this.authVersion
      const tree = this.$refs.permissionTree
      const nodes = this.getMenuNodes()
      const granted = new Set(this.grantedMenuIds)
      const menuIds = [...new Set([...tree.getCheckedKeys(false), ...tree.getHalfCheckedKeys()])]
        .filter(id => nodes.has(id) && (!nodes.get(id).node.disabled || granted.has(id)))
      this.saving = true
      this.saveError = ''
      try {
        const ids = getResultData(await saveRoleMenuPermissions({ roleId, menuIds }))
        if (!this.isCurrent(seq, authVersion, roleId)) return
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('权限已提交，响应格式异常，请重新加载确认')
        this.applyGrantedKeys(ids)
        this.$message.success('菜单权限已保存')
        this.$emit('update:visible', false)
        this.$emit('saved')
        try {
          if (authVersion === this.authVersion) await this.$store.dispatch('system/ensureMenusLoaded', { force: true })
        } catch (error) {
          if (authVersion === this.authVersion && !error.authChanged && !error.authHandled) this.$message.warning('权限已保存，当前菜单刷新失败，请重新加载菜单')
        }
      } catch (error) {
        if (this.isCurrent(seq, authVersion, roleId) && !error.authChanged) this.saveError = (error.response && error.response.data && error.response.data.msg) || error.message || '保存失败'
      } finally { if (this.isCurrent(seq, authVersion, roleId)) this.saving = false }
    },
    beforeClose(done) { if (!this.saving) done() },
    close() { if (!this.saving) this.$emit('update:visible', false) }
  }
}
</script>

<style scoped>
.permission-hint { margin-bottom: 16px; }
.tree-container { min-height: 160px; max-height: 440px; overflow: auto; border: 1px solid #ebeef5; border-radius: 4px; padding: 12px; }
.tree-node { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.tree-node i { margin-right: 6px; color: #909399; }
</style>
