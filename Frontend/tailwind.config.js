/** @type {import('tailwindcss').Config} */
export default {
  // 确保这里的路径覆盖了所有包含 Tailwind Class 的文件
  // 对于标准的 Vite/React 项目，这意味着扫描 src 目录下的所有 JS/JSX/TS/TSX 文件
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}