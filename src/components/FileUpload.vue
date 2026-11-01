<template>
  <div class="file-upload" @click="triggerPick">
    <slot :uploading="uploading">
      <el-button :loading="uploading" size="small">上传文件</el-button>
    </slot>
    <input
      ref="input"
      type="file"
      :accept="accept"
      class="file-upload-input"
      @change="handleChange"
    />
  </div>
</template>

<script>
import { uploadFile } from '@/api/system/file'

/**
 * 通用文件上传组件。
 *
 * 用法：
 *   <FileUpload module="Avatar" type="avatar" acl="public" @success="onSuccess">
 *     <template #default="{ uploading }">
 *       <el-button :loading="uploading">更换头像</el-button>
 *     </template>
 *   </FileUpload>
 *
 * 事件：
 *   success  ({ uuid, fileName, fileType, fileSize })
 *   error    (message)
 */
export default {
  name: 'FileUpload',
  props: {
    /** 业务模块/目录（必填，仅字母数字下划线横线） */
    module: { type: String, required: true },
    /** 文件类型（如 avatar） */
    type: { type: String, default: '' },
    /** 访问模式 'public' | 'private'，默认 public */
    acl: { type: String, default: 'public' },
    /** 可选文件类型，如 image/png,image/jpeg */
    accept: { type: String, default: '' },
    /** 最大体积（MB），0 表示不限 */
    maxSize: { type: Number, default: 0 }
  },
  data() {
    return { uploading: false }
  },
  methods: {
    triggerPick() {
      if (this.uploading) return
      // 清空 value 以便重复选择同一文件
      this.$refs.input.value = ''
      this.$refs.input.click()
    },
    async handleChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      if (this.maxSize > 0 && file.size > this.maxSize * 1024 * 1024) {
        const msg = `文件不能超过 ${this.maxSize}MB`
        this.$message.error(msg)
        this.$emit('error', msg)
        return
      }
      this.uploading = true
      try {
        const res = await uploadFile(file, this.module, this.type, this.acl)
        this.$emit('success', {
          uuid: res.uuid,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        })
      } catch (err) {
        const msg = (err && err.message) || '上传失败'
        this.$emit('error', msg)
      } finally {
        this.uploading = false
      }
    }
  }
}
</script>

<style scoped>
.file-upload { display: inline-block; }
.file-upload-input { display: none; }
</style>
