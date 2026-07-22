# 向前 · 大学生生涯导航

可部署的本地隐私优先产品原型。它把“先认识自己”落实为任务、证据和复盘，而不是给学生一份无法解释的职业测评分数。

## 产品入口

- **低年级学生**：六步探索，将价值、专业场景、动机、愿景转为方向与探索行动。
- **高年级学生**：就业、推免、考研、考公路径；岗位诊断会解释能力差距，并生成按阶段安排的成长计划。
- **研究生**：录入研究方向和成果，获得科研与职业准备并行的双线计划，以及成果到能力证据的映射。
- **教师端**：只展示明确标注的脱敏模拟样本，用于演示聚合筛选、资源需求和教学建议。

所有学生任务都可完成、记录复盘，并在刷新后保存在当前浏览器。界面采用“阅读优先、信号克制”的设计：浅色界面服务行动与表单，深色信号面板只用于准备度、趋势和证据可视化。

## 数据边界

这是本地演示原型：不会收集身份、联系方式、成绩或真实就业数据。浏览器只保存画像、任务与复盘；教师数据是独立的模拟样本。AI 辅导必须由学生主动点击，并且只发送界面中明确列出的最小字段。

不要将密钥写入仓库、前端代码、浏览器存储或日志。

## 本地开发

```bash
npm ci
npm run dev
```

浏览器访问 `http://127.0.0.1:5173/`。

可选 AI 服务使用 DeepSeek。先在另一个终端运行以下命令，脚本会安全提示输入新的密钥，不会落盘：

```powershell
.\scripts\start-local-ai.ps1
```

前端会把 `/api/*` 代理到 `127.0.0.1:8787`。缺少密钥时，AI 卡片会明确降级，所有规则推荐与行动计划仍可使用。

## 质量门禁

```bash
npm run check:server
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:visual
npm run build
npm audit --omit=dev
docker compose config --quiet
```

也可以使用 `npm run check:release` 一次执行应用层完整发布门禁。视觉审计会自动启动缺失的本地服务，检查桌面与手机关键页的控制台错误和水平溢出，并把截图写入被 Git 忽略的 `test-results/release-audit/`。

## 自管服务器部署

项目使用双容器：Nginx 负责静态文件、深链接回退、`/healthz` 和 `/api` 代理；Node API 容器只在内部网络调用 DeepSeek，提供超时、限流和无缓存响应。

在受权限保护的部署环境中设置变量后再启动：

```bash
export DEEPSEEK_API_KEY='new-key-created-outside-chat'
export DEEPSEEK_MODEL='deepseek-v4-flash'
docker compose up --build -d
curl http://127.0.0.1:8080/healthz
docker compose exec api wget -qO- http://127.0.0.1:8787/healthz
```

部署前请验证首页、四个角色入口、任意深链接刷新、AI 降级状态与 `/healthz`。生产 HTTPS 应在学校/自管服务器的反向代理或负载均衡层终止。

## 真实数据接入前

接入账号、真实学生数据、真实学院统计或线上模型前，必须先补齐认证与角色权限、审计日志、数据保留策略、供应商评估、隐私告知与审批流程。规则引擎位于 `src/services/recommendation.ts`，AI 代理位于 `server/`，两者可独立替换为校内服务。
