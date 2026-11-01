<template>
  <div class="profile-page">
    <!-- 个人信息头卡 -->
    <el-card class="profile-card" shadow="never">
      <div class="profile-header">
        <div class="avatar-box">
          <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" alt="头像" />
          <div v-else class="avatar-placeholder">{{ avatarLetter }}</div>
          <div class="avatar-edit">
            <i class="el-icon-edit"></i>
          </div>
        </div>
        <div class="profile-meta">
          <div class="nickname">{{ userInfo.nickname || userInfo.email }}</div>
          <div class="sub">
            用户编码：{{ userInfo.code || '-' }} · 邮箱：{{ userInfo.email || '-' }}
          </div>
        </div>
        <div class="avatar-action">
          <FileUpload
            module="Avatar"
            type="avatar"
            acl="public"
            accept="image/*"
            :max-size="5"
            @success="onAvatarUploaded"
            @error="onAvatarError"
          >
            <template #default="{ uploading }">
              <el-button size="small" :loading="uploading">更换头像</el-button>
            </template>
          </FileUpload>
        </div>
      </div>
    </el-card>

    <!-- 基本信息 -->
    <el-card class="profile-card" shadow="never">
      <div class="card-title">基本信息</div>
      <el-form :model="form" label-width="90px" size="small">
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入昵称"></el-input>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input :value="userInfo.email" disabled></el-input>
        </el-form-item>
        <el-form-item label="用户编码">
          <el-input :value="userInfo.code" disabled></el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="填写个人简介"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveProfile">保存修改</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 账号管理 -->
    <el-card class="profile-card" shadow="never">
      <div class="card-title">账号管理</div>
      <div class="account-row">
        <div>
          <div class="row-title">换绑邮箱</div>
          <div class="row-sub">当前：{{ userInfo.email || '-' }} · 换绑后使用新邮箱登录</div>
        </div>
        <el-button size="small" @click="openRebind">换绑</el-button>
      </div>
      <div class="account-row">
        <div>
          <div class="row-title">QQ 登录</div>
          <div class="row-sub">绑定后可使用 QQ 快捷登录（仅 Web 端）</div>
        </div>
        <el-tag size="small" type="info">暂未开放</el-tag>
      </div>
    </el-card>

    <!-- 换绑邮箱弹窗 -->
    <el-dialog
      title="换绑邮箱"
      :visible.sync="rebindVisible"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px" size="small">
        <el-form-item label="新邮箱">
          <el-input v-model="rebindForm.email" placeholder="请输入新邮箱"></el-input>
        </el-form-item>
        <el-form-item label="验证码">
          <div class="code-row">
            <el-input v-model="rebindForm.code" placeholder="6位验证码"></el-input>
            <el-button :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="rebindVisible = false">取消</el-button>
        <el-button type="primary" :loading="rebinding" @click="doRebind">确认换绑</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import FileUpload from '@/components/FileUpload'
import { fileUrl } from '@/utils/fileUrl'
import { getCurrentUser, updateProfile, rebindEmail, sendRebindCode } from '@/api/system/user'
import { getResultData } from '@/utils/result'

export default {
  name: 'ProfileView',
  components: { FileUpload },
  data() {
    return {
      avatarUrl: '',
      form: {
        nickname: '',
        remark: ''
      },
      saving: false,
      rebindVisible: false,
      rebindForm: {
        email: '',
        code: ''
      },
      rebinding: false,
      countdown: 0,
      timer: null
    }
  },
  computed: {
    userInfo() {
      return this.$store.state.system.userInfo || {}
    },
    avatarLetter() {
      return (this.userInfo.nickname || this.userInfo.email || 'U').charAt(0).toUpperCase()
    },
    avatarFileId() {
      return this.userInfo.avatarFileId || ''
    }
  },
  watch: {
    // 监听头像文件 id，变化时加载头像
    avatarFileId: {
      immediate: true,
      async handler(id) {
        if (id) {
          this.avatarUrl = await fileUrl(id)
        } else {
          this.avatarUrl = ''
        }
      }
    },
    // 监听昵称/备注，刷新后 userInfo 异步加载完成时初始化表单
    'userInfo.nickname': {
      immediate: true,
      handler() {
        this.initForm()
      }
    }
  },
  created() {
    this.initForm()
  },
  methods: {
    initForm() {
      this.form.nickname = this.userInfo.nickname || ''
      this.form.remark = this.userInfo.remark || ''
    },
    resetForm() {
      this.initForm()
    },
    async onAvatarUploaded(data) {
      // 保存头像，updateProfile 返回最新 UserInfoVo
      const info = await updateProfile({
        nickname: this.userInfo.nickname,
        avatarFileId: data.uuid,
        remark: this.userInfo.remark
      })
      this.$store.commit('system/SET_USER_INFO', info)
      // 上传后直接显示新头像
      this.avatarUrl = await fileUrl(data.uuid)
      this.initForm()
      this.$message.success('头像已更新')
    },
    onAvatarError(msg) {
      this.$message.error(msg)
    },
    async saveProfile() {
      this.saving = true
      try {
        const info = await updateProfile({
          nickname: this.form.nickname,
          avatarFileId: this.userInfo.avatarFileId,
          remark: this.form.remark
        })
        this.$store.commit('system/SET_USER_INFO', info)
        this.initForm()
        this.$message.success('保存成功')
      } catch (e) {
        this.$message.error((e && e.message) || '保存失败')
      } finally {
        this.saving = false
      }
    },
    async refreshUserInfo() {
      try {
        const info = getResultData(await getCurrentUser())
        this.$store.commit('system/SET_USER_INFO', info)
        this.initForm()
      } catch (e) {
        // 忽略刷新失败
      }
    },
    openRebind() {
      this.rebindForm = { email: '', code: '' }
      this.rebindVisible = true
    },
    async sendCode() {
      if (!this.rebindForm.email) {
        this.$message.warning('请先输入新邮箱')
        return
      }
      try {
        await sendRebindCode(this.rebindForm.email)
        this.$message.success('验证码已发送')
        this.countdown = 60
        this.timer = setInterval(() => {
          this.countdown--
          if (this.countdown <= 0) clearInterval(this.timer)
        }, 1000)
      } catch (e) {
        this.$message.error((e && e.message) || '验证码发送失败')
      }
    },
    async doRebind() {
      if (!this.rebindForm.email || !this.rebindForm.code) {
        this.$message.warning('请填写新邮箱和验证码')
        return
      }
      this.rebinding = true
      try {
        await rebindEmail(this.rebindForm.email, this.rebindForm.code)
        this.$message.success('邮箱换绑成功')
        this.rebindVisible = false
        this.refreshUserInfo()
      } catch (e) {
        this.$message.error((e && e.message) || '换绑失败')
      } finally {
        this.rebinding = false
      }
    }
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer)
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 800px;
}

.profile-card {
  margin-bottom: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-box {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 500;
}

.avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}

.profile-meta {
  flex: 1;
}

.nickname {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.sub {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 16px;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.account-row:last-child {
  border-bottom: none;
}

.row-title {
  font-size: 14px;
  color: #303133;
}

.row-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
