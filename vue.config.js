const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  devServer: {
    open: true,
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      // 开发环境代理：所有 /api 请求转发到 PivotHub Gateway（默认端口 8080）
      '/api': {
        target: process.env.VUE_APP_BASE_API,
        changeOrigin: true,
        timeout: 60000,
        ws: true
      }
    }
  },
  productionSourceMap: false,
  lintOnSave: false
});
