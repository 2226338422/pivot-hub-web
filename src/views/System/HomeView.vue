<template>
  <el-card class="home-card" shadow="never">
    <h2>欢迎使用 PivotHub</h2>
    <p>{{ displayName }}，欢迎回来。</p>
    <p v-if="userInfo.email">当前邮箱：{{ userInfo.email }}</p>
    <p>左侧菜单根据当前账号权限加载。</p>
  </el-card>
</template>

<script>
export default {
  name: 'HomeView',
  computed: {
    userInfo() { return this.$store.state.system.userInfo || {} },
    displayName() { return this.userInfo.nickname || this.userInfo.email || '用户' }
  }
}
</script>

<style scoped>
.home-card h2 { margin: 0 0 24px; color: #303133; }
.home-card p { line-height: 1.8; color: #606266; }
</style>
