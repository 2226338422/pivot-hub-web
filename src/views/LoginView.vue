<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo-area"><span class="logo-letter">P</span><span class="logo-text">PivotHub</span></div>
        <p class="login-desc">管理系统</p>
      </div>
      <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form" label-position="top" @submit.native.prevent="handleLogin">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="loginForm.email" placeholder="请输入邮箱" prefix-icon="el-icon-message" autocomplete="email" :disabled="loading" @keyup.enter.native="handleLogin" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="loginForm.code" placeholder="请输入6位验证码" prefix-icon="el-icon-lock" maxlength="6" autocomplete="one-time-code" :disabled="loading" @keyup.enter.native="handleLogin" />
            <el-button :loading="sendingCode" :disabled="loading || countdown > 0" @click="sendCode">{{ countdown > 0 ? countdown + '秒后重发' : '发送验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="login-btn" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer"><span>使用邮箱验证码登录</span></div>
    </div>
  </div>
</template>

<script>
import { login, sendMailCode } from '@/api/system/auth'
import { getResultData } from '@/utils/result'
import { getLoginTarget } from '@/utils/menu'

export default {
  name: 'LoginView',
  data() {
    return {
      loginForm: { email: '', code: '' },
      loginRules: {
        email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
        code: [{ required: true, message: '请输入验证码', trigger: 'blur' }, { pattern: /^\d{6}$/, message: '验证码必须为6位数字', trigger: 'blur' }]
      },
      loading: false, sendingCode: false, countdown: 0, codeDeadline: 0, codeTimer: null
    }
  },
  beforeDestroy() { clearInterval(this.codeTimer) },
  methods: {
    normalizeForm() {
      this.loginForm.email = this.loginForm.email.trim().toLowerCase()
      this.loginForm.code = this.loginForm.code.trim()
    },
    errorMessage(error, fallback) {
      return (error.response && error.response.data && error.response.data.msg) || (error.response ? fallback : error.message) || fallback
    },
    async sendCode() {
      if (this.sendingCode || this.countdown > 0 || this.loading) return
      this.sendingCode = true
      this.normalizeForm()
      try {
        const valid = await new Promise(resolve => this.$refs.loginForm.validateField('email', message => resolve(!message)))
        if (!valid) return
        getResultData(await sendMailCode(this.loginForm.email))
        if (this._isDestroyed) return
        this.$message.success('验证码已发送，请查收邮件')
        this.codeDeadline = Date.now() + 60000
        const tick = () => {
          this.countdown = Math.max(0, Math.ceil((this.codeDeadline - Date.now()) / 1000))
          if (!this.countdown) clearInterval(this.codeTimer)
        }
        clearInterval(this.codeTimer)
        tick()
        this.codeTimer = setInterval(tick, 1000)
      } catch (error) {
        if (!this._isDestroyed) this.$message.error(this.errorMessage(error, '验证码发送失败，请稍后重试'))
      } finally {
        this.sendingCode = false
      }
    },
    async handleLogin() {
      if (this.loading) return
      this.loading = true
      this.normalizeForm()
      let loggedIn = false
      let version = this.$store.state.common.authVersion
      try {
        const valid = await this.$refs.loginForm.validate().catch(() => false)
        if (!valid) return
        const tokens = getResultData(await login(this.loginForm))
        if (this._isDestroyed || this.$store.state.common.authVersion !== version) return
        await this.$store.dispatch('common/handleLoginSuccess', tokens)
        loggedIn = true
        version += 1
        if (this.$store.state.common.authVersion !== version) return
        await this.$store.dispatch('system/ensureMenusLoaded')
        if (this.$store.state.common.authVersion !== version || !this.$store.state.common.token) return
        await this.$router.replace(getLoginTarget(this.$store.state.system.menuTree, this.$route.query.redirect))
      } catch (error) {
        if (error.authChanged || error.authHandled || this._isDestroyed || this.$store.state.common.authVersion !== version) return
        if (loggedIn && this.$store.state.common.token) {
          await this.$router.replace({ path: '/access-state', query: { kind: 'error' } })
        } else {
          this.$message.error(this.errorMessage(error, '登录失败，请检查邮箱和验证码'))
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
<style scoped>
.code-row { display: flex; gap: 12px; }
.code-row .el-input { flex: 1; }
.code-row .el-button { min-width: 120px; }

.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo-letter {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  color: #fff;
  font-size: 22px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.login-desc {
  margin-top: 6px;
  color: #909399;
  font-size: 14px;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
