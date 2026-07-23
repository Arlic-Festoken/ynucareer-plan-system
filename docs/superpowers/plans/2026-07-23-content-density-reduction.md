# Content Density Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-manual:subagent-driven-development (recommended) or superpowers-manual:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简全站解释性文案，让每页优先呈现结论、下一步和操作。

**Architecture:** 不新增状态或组件，只修改现有页面的展示文案；保留表单标签、任务详情、错误提示及数据边界。使用现有 Playwright 主流程与 15 页面视觉审计作为回归门禁。

**Tech Stack:** React 19、TypeScript、Playwright、Vitest、Vite、Docker Compose

---

### Task 1: 精简公共入口与工作台

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/pages/OnboardingPage.tsx`
- Modify: `src/pages/StudentHomePage.tsx`
- Modify: `src/components/common/AiCoachCard.tsx`
- Modify: `src/components/product/ActionFocusCard.tsx`

- [ ] **Step 1: 缩短首页和引导页说明**

将首页结果卡说明压缩为“做一次访谈或作品，获得真实反馈”等短句；将引导页的隐私说明保留为“无需姓名、成绩或联系方式；资料仅存本机”。

- [ ] **Step 2: 删除工作台重复教学段落**

移除 `workbench-bottom` 的两块长说明；把进度、证据和 AI 辅导说明分别压缩成一句，不改变主按钮、任务入口和 AI 状态处理。

- [ ] **Step 3: 缩短公共行动卡反馈**

把“完成后，它会成为下一次选择的证据”改为“完成后留下方向证据”，AI 数据提示改为“仅发送当前画像与行动；不含身份、成绩或联系方式”。

### Task 2: 精简四类业务页面

**Files:**
- Modify: `src/pages/AwakeningPage.tsx`
- Modify: `src/pages/MatchingPage.tsx`
- Modify: `src/pages/RoadmapPage.tsx`
- Modify: `src/pages/GraduatePage.tsx`
- Modify: `src/pages/AdminDashboardPage.tsx`

- [ ] **Step 1: 压缩探索和匹配说明**

每一步只保留直接操作提示；保留“自评不是考试”和“匹配分不是录取概率”的边界。岗位卡的具体工作内容和能力差距解释不删除。

- [ ] **Step 2: 压缩路线图和研究生页面说明**

路线图只说明“完成后可复盘”；研究生页面只说明“研究与职业并行”，保留输入要求、成果映射和双线任务内容。

- [ ] **Step 3: 压缩教师端说明**

将数据边界合并为“仅展示脱敏模拟样本，不读取个人画像”；教学建议保留一条可执行动作，不再展开多种示例。

### Task 3: 回归与发布

**Files:**
- Modify: `e2e/navigation.spec.ts`（仅在可见文本断言变化时）
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `compose.yml`
- Modify: `README.md`

- [ ] **Step 1: 运行静态检查**

Run: `npm run typecheck && npm run lint`

Expected: 两个命令退出码均为 0。

- [ ] **Step 2: 运行功能与视觉门禁**

Run: `npm run test && npm run test:e2e && npm run test:visual`

Expected: 12 个单元测试、13 个端到端测试和 15 个页面视觉检查全部通过，无控制台错误和横向溢出。

- [ ] **Step 3: 运行完整发布检查**

Run: `npm run check:release`

Expected: 类型、Lint、测试、视觉审计、构建和依赖审计全部通过。

- [ ] **Step 4: 发布补丁版本**

执行 `npm version 0.3.1 --no-git-tag-version`，把 `compose.yml` 的前端和 API 镜像标签同步为 `0.3.1`，重建容器并验证 `http://127.0.0.1:8080/` 与 `/healthz`。

- [ ] **Step 5: 提交并推送**

提交信息使用 `refactor: reduce content density across product`，推送 `master` 到现有 Gitee 远端。
