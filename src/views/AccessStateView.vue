<template>
  <el-card class="access-card" shadow="never">
    <i :class="kind === 'error' ? 'el-icon-warning-outline' : 'el-icon-lock'"></i>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <el-button v-if="kind === 'forbidden'" type="primary" @click="returnToAllowed">返回已授权页面</el-button>
    <el-button v-else type="primary" :loading="loading" @click="reloadMenus">重新加载</el-button>
  </el-card>
</template>

<script>
import { getLoginTarget } from '@/utils/menu'

export default {
  name: 'AccessStateView',
  data() { return { loading: false } },
  computed: {
    kind() { return ['empty', 'forbidden', 'error'].includes(this.$route.query.kind) ? this.$route.query.kind : 'empty' },
    title() { return { empty: '暂无可访问菜单', forbidden: '无权访问该页面', error: '菜单加载失败' }[this.kind] },
    description() {
      if (this.kind === 'error') return this.$store.state.system.menuLoadError || '暂时无法加载菜单，请稍后重试。'
      return this.kind === 'forbidden' ? '当前账号未获授该页面的访问权限。' : '当前账号尚未获授可显示的菜单，授权后可重新加载。'
    }
  },
  methods: {
    returnToAllowed() { return this.$router.replace(getLoginTarget(this.$store.state.system.menuTree)) },
    async reloadMenus() {
      if (this.loading) return
      this.loading = true
      const version = this.$store.state.common.authVersion
      try {
        await this.$store.dispatch('system/ensureMenusLoaded', { force: true })
        if (version === this.$store.state.common.authVersion && this.$store.state.common.token) await this.returnToAllowed()
      } catch (error) {
        if (error.authChanged || error.authHandled || !this.$store.state.common.token || version !== this.$store.state.common.authVersion) return
        await this.$router.replace({ path: '/access-state', query: { kind: 'error' } })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.access-card { text-align: center; padding: 48px 16px; }
.access-card > .el-card__body > i { color: #909399; font-size: 48px; }
.access-card h2 { color: #303133; }
.access-card p { color: #606266; margin-bottom: 24px; }
</style>
