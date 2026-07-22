# 分层递进生涯导航平台 Demo

这是一个用于截图、录屏和答辩展示的苹果风格前端 Demo。系统重点放在“完整生涯教育产品闭环”的呈现，不依赖真实后端和数据库。

## 技术栈

- React + Vite + TypeScript
- Framer Motion
- Recharts
- Zustand
- Lucide React
- 本地 Mock 数据与前端伪接口

## 运行

```bash
npm install
npm run dev
```

如果默认端口被占用，Vite 会自动切换到下一个端口。当前验证时服务运行在：

```text
http://127.0.0.1:5174/
```

## 构建

```bash
npm run build
```

## 页面

- `/`：项目展示首页
- `/login`：模拟身份选择
- `/student/awakening`：低年级六步生涯唤醒
- `/student/matching`：高年级岗位精准匹配
- `/student/roadmap`：个性化成长路线图
- `/admin/dashboard`：学院群体分析仪表板
- `/demo`：录屏专用演示流程页

## 推荐录屏流程

1. 打开首页，展示系统定位和五段闭环。
2. 进入 `/login`，选择“大一学生”。
3. 在低年级唤醒页展示“国家发展战略与你的专业”和“用行动创造结果”。
4. 进入岗位匹配页，选择“数据分析师”或“AI应用开发工程师”。
5. 点击生成成长路线图。
6. 进入教师端仪表板，展示学院群体画像与教学建议。

## 已验证

- `npm run build` 通过。
- Playwright 打开并检查首页、登录、唤醒、匹配、路线图、教师端、演示页。
- 桌面端与移动端未发现横向溢出。
- 岗位切换和行动计划生成交互可用。
