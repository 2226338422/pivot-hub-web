const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  devServer: {
    open: true,
    host: '0.0.0.0',
    port: 8088,
    proxy: {
      // 开发环境代理：/api 请求转发到环境变量指定的 PivotHub Gateway
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
