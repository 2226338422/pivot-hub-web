<template>
  <el-card class="community-card" shadow="never">
    <h2>公共社区</h2>
    <p>分享想法与日常，参与开放交流。</p>
    <el-empty description="社区内容建设中" :image-size="100" />
  </el-card>
</template>

<script>
export default {
  name: 'PublicCommunityView'
}
</script>

<style scoped>
.community-card h2 { margin: 0 0 16px; color: #303133; }
.community-card p { line-height: 1.8; color: #606266; }
</style>
