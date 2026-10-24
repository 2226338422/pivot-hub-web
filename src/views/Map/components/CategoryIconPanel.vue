<!-- 分类管理弹窗：维护当前主题的地点分类名称和排序，支持新增、编辑与删除。 -->
<template><el-dialog title="当前主题分类" :visible="visible" width="680px" :close-on-click-modal="false" @close="$emit('close')">
      <div v-for="category in categories" :key="category.uuid" class="resource-row"><span>{{ category.name }}</span><span><el-button type="text" @click="editCategory(category)">编辑</el-button><el-button type="text" @click="removeCategory(category)">删除</el-button></span></div>
      <p v-if="!categories.length">尚无分类。未分类地点使用基础标记。</p>
      <el-form label-position="top"><el-form-item label="分类名称"><el-input v-model="categoryForm.name" maxlength="64" /></el-form-item><el-form-item label="排序"><el-input-number v-model="categoryForm.sort" :min="0" :max="99999" /></el-form-item></el-form>
      <el-button type="primary" :loading="saving" @click="saveCategoryForm">{{ categoryForm.categoryId ? '保存分类' : '添加分类' }}</el-button><el-button @click="resetCategory">清空表单</el-button>
  <p class="muted">地点使用基础标记，图标素材上传暂未开放。</p><MapFeedback :error="error" />
</el-dialog></template>
<script>
import * as api from '@/api/business/map'
import { getMapError } from '@/utils/map/mapErrors'
import MapFeedback from './MapFeedback.vue'
export default {
  components: { MapFeedback },
  props: { visible: Boolean, themeId: String, categories: Array, contextKey: [String, Number] },
  data: () => ({ categoryForm: { name: '', iconId: null, sort: 0 }, saving: false, error: '', sequence: 0 }),
  watch: { visible(value) { this.sequence++; if (value) { this.resetCategory(); this.error = ''; this.saving = false } }, contextKey() { this.sequence++; this.saving = false } },
  beforeDestroy() { this.sequence++ },
  methods: {
    resetCategory() { this.categoryForm = { name: '', iconId: null, sort: 0 } },
    editCategory(c) { this.categoryForm = { categoryId: c.uuid, name: c.name, iconId: null, sort: c.sort || 0 } },
    async perform(action, done) {
      if (this.saving) return
      const seq = ++this.sequence; this.saving = true; this.error = ''
      try { await action(); if (seq === this.sequence) { done(); this.$emit('changed') } }
      catch (error) { if (seq === this.sequence && !error.authChanged && !error.authHandled) this.error = getMapError(error, '分类暂时无法保存，填写内容已保留') }
      finally { if (seq === this.sequence) this.saving = false }
    },
    saveCategoryForm() {
      if (!this.themeId) { this.error = '请先创建或选择主题，再添加分类'; return }
      if (!this.categoryForm.name.trim()) { this.error = '请输入分类名称'; return }
      const data = { ...this.categoryForm, name: this.categoryForm.name.trim(), iconId: null }
      if (!data.categoryId) data.themeId = this.themeId
      return this.perform(() => api.saveCategory(data), this.resetCategory)
    },
    async removeCategory(category) { const context = this.contextKey; try { await this.$confirm(`删除分类「${category.name}」？仍有地点引用时无法删除。`, '删除分类', { type: 'warning' }); if (!this.visible || context !== this.contextKey || this._isDestroyed) return; await this.perform(() => api.deleteCategory(category.uuid), this.resetCategory) } catch (error) { if (error !== 'cancel' && error !== 'close' && context === this.contextKey && !error.authChanged && !error.authHandled) this.error = getMapError(error, '分类操作暂时无法完成，填写内容已保留') } }
  }
}
</script>
<style scoped>.resource-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9edf2;padding:8px 0}.muted{color:#758096;font-size:12px}.error{color:#c43d3d}.el-input-number{margin-right:8px}::v-deep .el-dialog{max-width:calc(100% - 24px)}</style>
