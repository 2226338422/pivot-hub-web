<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="logo-area">
          <span class="logo-letter">P</span>
          <span class="logo-text">PivotHub</span>
        </div>
        <p class="login-desc">管理系统</p>
      </div>

      <el-form
        ref="loginForm"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="el-icon-user"
            size="large"
            @keyup.enter.native="handleLogin"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            size="large"
            show-password
            @keyup.enter.native="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span>默认管理员：admin / admin123</span>
      </div>
    </div>
  </div>
</template>

<script>
import { login } from '@/api/system/auth'

export default {
  name: 'LoginView',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少 6 位', trigger: 'blur' }
        ]
      },
      loading: false
    }
  },
  methods: {
    handleLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) return
        this.loading = true
        try {
          const res = await login(this.loginForm)
          if (res.data.code === 201 || res.data.code === 200) {
            const { accessToken, refreshToken } = res.data.data
            await this.$store.dispatch('common/handleLoginSuccess', {
              accessToken,
              refreshToken,
              role: 'admin'
            })
            // 加载菜单树
            const userId = res.data.data.userId
            await this.$store.dispatch('system/fetchMenuTree', userId)
            this.$router.push('/system/users')
          } else {
            this.$message.error(res.data.msg || '登录失败')
          }
        } catch (e) {
          this.$message.error('登录失败，请检查用户名或密码')
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style scoped>
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
