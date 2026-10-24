<template>
  <el-card class="community-card" shadow="never">
    <h2>开发者社区</h2>
    <p>交流开发经验，分享技术知识。</p>
    <el-empty description="社区内容建设中" :image-size="100" />
  </el-card>
</template>

<script>
export default {
  name: 'DeveloperCommunityView'
}
</script>

<style scoped>
.community-card h2 { margin: 0 0 16px; color: #303133; }
.community-card p { line-height: 1.8; color: #606266; }
</style>
