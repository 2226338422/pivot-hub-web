<template>
  <el-dialog :title="roleId ? '编辑角色' : '新增角色'" :visible="visible" width="560px" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" :before-close="beforeClose" @update:visible="$emit('update:visible', $event)">
    <div v-loading="loading">
      <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="form-error" />
      <el-button v-if="loadFailed" type="text" @click="loadForm">重新加载</el-button>
      <el-form ref="form" :model="form" :rules="rules" label-width="90px" :disabled="loading || loadFailed || saving">
        <el-form-item label="角色编码" :prop="roleId ? '' : 'code'"><el-input v-model="form.code" :disabled="!!roleId" maxlength="64" placeholder="字母、数字、下划线或短横线" /></el-form-item>
        <el-form-item label="角色名称" prop="name"><el-input v-model="form.name" maxlength="64" show-word-limit placeholder="请输入角色名称" /></el-form-item>
        <el-form-item label="默认角色"><el-switch v-model="form.defa" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" /><p class="field-hint">设为默认角色后，将替换当前默认角色。</p></el-form-item>
        <el-form-item label="排序" prop="sort"><el-input-number v-model="form.sort" :min="0" :max="2147483647" :precision="0" /></el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
    </div>
    <span slot="footer"><el-button :disabled="saving" @click="close">取消</el-button><el-button type="primary" :loading="saving" :disabled="loading || loadFailed" @click="submit">保存</el-button></span>
  </el-dialog>
</template>

<script>
import { getRoleDetail, addRole, updateRole } from '@/api/system/role'
import { getResultData } from '@/utils/result'

const emptyForm = () => ({ code: '', name: '', sort: 0, remark: '', defa: 0 })

export default {
  name: 'RoleFormDialog',
  props: { visible: Boolean, roleId: { type: String, default: '' } },
  data() {
    return { form: emptyForm(), loading: false, saving: false, loadFailed: false, formError: '', loadSeq: 0,
      rules: { code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }, { pattern: /^[A-Za-z0-9_-]{1,64}$/, message: '编码只能包含字母、数字、下划线或短横线', trigger: 'blur' }],
        name: [{ required: true, whitespace: true, message: '请输入角色名称', trigger: 'blur' }],
        sort: [{ required: true, type: 'number', message: '请输入排序', trigger: 'change' }] } }
  },
  computed: { authVersion() { return this.$store.state.common.authVersion } },
  watch: {
    visible(value) { if (value) this.loadForm(); else this.invalidate() },
    authVersion() { this.invalidate(); this.$emit('update:visible', false) }
  },
  beforeDestroy() { this.invalidate() },
  methods: {
    invalidate() { this.loadSeq += 1; this.loading = false; this.saving = false },
    isCurrent(seq, authVersion, roleId) { return seq === this.loadSeq && authVersion === this.authVersion && this.visible && roleId === this.roleId },
    async loadForm() {
      const seq = ++this.loadSeq
      const roleId = this.roleId
      const authVersion = this.authVersion
      this.form = emptyForm()
      this.formError = ''
      this.loadFailed = false
      this.loading = !!roleId
      this.saving = false
      await this.$nextTick()
      if (this.$refs.form) this.$refs.form.clearValidate()
      if (!roleId) return
      try {
        const role = getResultData(await getRoleDetail(roleId))
        if (!this.isCurrent(seq, authVersion, roleId)) return
        if (!role || role.uuid !== roleId) throw new Error('角色详情数据格式不正确')
        this.form = { code: role.code || '', name: role.name || '', sort: role.sort, remark: role.remark || '', defa: role.defa }
      } catch (error) {
        if (this.isCurrent(seq, authVersion, roleId) && !error.authChanged) {
          this.loadFailed = true
          this.formError = (error.response && error.response.data && error.response.data.msg) || error.message || '角色加载失败'
        }
      } finally { if (this.isCurrent(seq, authVersion, roleId)) this.loading = false }
    },
    submit() {
      if (this.saving || this.loading || this.loadFailed || !this.$refs.form) return
      this.$refs.form.validate(valid => { if (valid) this.save() })
    },
    async save() {
      if (this.saving) return
      const seq = this.loadSeq
      const roleId = this.roleId
      const authVersion = this.authVersion
      this.saving = true
      this.formError = ''
      const data = { name: this.form.name.trim(), defa: this.form.defa, sort: this.form.sort, remark: this.form.remark }
      try {
        getResultData(await (roleId ? updateRole({ ...data, roleId }) : addRole({ ...data, code: this.form.code.trim() })))
        if (!this.isCurrent(seq, authVersion, roleId)) return
        this.$message.success(roleId ? '角色已更新' : '角色已新增')
        this.$emit('update:visible', false)
        this.$emit('saved')
      } catch (error) {
        if (this.isCurrent(seq, authVersion, roleId) && !error.authChanged) this.formError = (error.response && error.response.data && error.response.data.msg) || error.message || '保存失败'
      } finally { if (this.isCurrent(seq, authVersion, roleId)) this.saving = false }
    },
    beforeClose(done) { if (!this.saving) done() },
    close() { if (!this.saving) this.$emit('update:visible', false) }
  }
}
</script>

<style scoped>
.form-error { margin-bottom: 16px; }
.field-hint { margin: 6px 0 0; color: #909399; font-size: 12px; line-height: 1.6; }
</style>
