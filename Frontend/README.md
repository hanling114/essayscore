# 前端运行指南

## 安装依赖

首先，确保你已经安装了 Node.js（推荐版本 18+），然后在 `Frontend` 目录下运行：

```bash
npm install
```

## 运行开发服务器

```bash
npm run dev
```

前端应用将在 `http://localhost:5173` 启动。

## 构建生产版本

```bash
npm run build
```

构建后的文件将输出到 `dist` 目录。

## 注意事项

1. **后端服务**：确保 Flask 后端服务在 `http://localhost:5000` 运行
2. **API 代理**：Vite 配置了代理，所有 `/api` 请求会自动转发到后端
3. **依赖**：项目使用 React 18 + Vite + Tailwind CSS

