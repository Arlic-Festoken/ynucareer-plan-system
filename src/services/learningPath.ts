import type {
  ActionTask,
  CurriculumCourse,
  CurriculumPlan,
  GraduateRoute,
  LearningPathInputs,
  LearningPathNode,
  LearningPathPlan,
  LearningResource,
} from "../domain";

export const algorithmResources: LearningResource[] = [
  { id: "mml-book", title: "Mathematics for Machine Learning", provider: "Cambridge University Press · 作者开放版", type: "book", url: "https://mml-book.com/", note: "按需复习线性代数、微积分与概率，不建议从头抄书。" },
  { id: "ml-specialization", title: "Machine Learning Specialization", provider: "DeepLearning.AI · Stanford Online", type: "course", url: "https://www.deeplearning.ai/courses/machine-learning-specialization/", note: "先建立监督学习、模型评估和无监督学习的完整框架。" },
  { id: "dls", title: "Deep Learning Specialization", provider: "DeepLearning.AI · Andrew Ng", type: "course", url: "https://www.deeplearning.ai/specializations/deep-learning/", note: "在具备 Python、线代和机器学习概念后学习神经网络、CNN、RNN 与 Transformer。" },
  { id: "d2l", title: "动手学深度学习", provider: "D2L.ai", type: "book", url: "https://zh.d2l.ai/", note: "数学、代码和实验结合；每章可直接运行 Notebook。" },
  { id: "pytorch", title: "PyTorch Learn the Basics", provider: "PyTorch 官方教程", type: "documentation", url: "https://docs.pytorch.org/tutorials/beginner/basics/intro.html", note: "完成数据、模型、自动求导、优化和保存加载的端到端练习。" },
  { id: "sklearn", title: "scikit-learn Getting Started", provider: "scikit-learn 官方文档", type: "documentation", url: "https://scikit-learn.org/stable/getting_started.html", note: "用于第一个可复现的传统机器学习基线。" },
  { id: "cs229", title: "CS229 Machine Learning", provider: "Stanford University", type: "course", url: "https://cs229.stanford.edu/", note: "第二遍理论提升材料；不要在尚未完成基础实践前硬啃全部讲义。" },
  { id: "deep-learning-book", title: "Deep Learning", provider: "MIT Press · Goodfellow, Bengio, Courville", type: "book", url: "https://www.deeplearningbook.org/", note: "适合作为进阶参考书，按问题查阅优化、正则化与模型章节。" },
];

const courseGroups = {
  calculus: /高等数学|高数|数学分析|微积分/i,
  linearAlgebra: /线性代数|高等代数|矩阵/i,
  probability: /概率|统计/i,
  programming: /程序设计|Python|C\+\+|Java|编程/i,
  dataStructure: /数据结构/i,
  algorithm: /算法设计|算法分析/i,
  ml: /机器学习|统计学习/i,
  dl: /深度学习|神经网络/i,
  ai: /人工智能导论|人工智能基础/i,
  english: /大学英语|英语/i,
};

type CourseGroup = keyof typeof courseGroups;

function matchedCourses(curriculum: CurriculumPlan | null, groups: CourseGroup[], statuses?: CurriculumCourse["status"][]) {
  if (!curriculum) return [];
  return curriculum.courses
    .filter((course) => groups.some((group) => courseGroups[group].test(course.name)))
    .filter((course) => !statuses || statuses.includes(course.status))
    .map((course) => course.name);
}

function hasCompleted(curriculum: CurriculumPlan | null, groups: CourseGroup[]) {
  if (!curriculum) return false;
  return groups.every((group) => curriculum.courses.some((course) => course.status === "completed" && courseGroups[group].test(course.name)));
}

function normalizedGpa(inputs: LearningPathInputs) {
  if (inputs.gpaScale === 100) return Math.max(0, Math.min(100, inputs.gpa));
  return Math.max(0, Math.min(100, inputs.gpa / inputs.gpaScale * 100));
}

export function diagnoseGraduateRoute(inputs: LearningPathInputs) {
  const gpa = normalizedGpa(inputs);
  const hasRank = inputs.rankPercentile !== null;
  let route: GraduateRoute;
  if (inputs.routePreference === "postgraduate") {
    route = "postgraduate_first";
  } else if (inputs.routePreference === "recommendation" && gpa >= 82 && inputs.rankPercentile !== null && inputs.rankPercentile <= 25) {
    route = "recommendation_first";
  } else if (hasRank && inputs.rankPercentile! <= 15 && gpa >= 85) {
    route = "recommendation_first";
  } else if (hasRank && inputs.rankPercentile! <= 30 && gpa >= 78) {
    route = "dual_track";
  } else if (!hasRank && gpa >= 85) {
    route = "dual_track";
  } else {
    route = "postgraduate_first";
  }
  const labels = {
    recommendation_first: "保研主线，考研保底",
    dual_track: "保研 / 考研双线并行",
    postgraduate_first: "考研主线，保研机会跟踪",
  };
  const reason = route === "recommendation_first"
    ? `当前标准化绩点约 ${Math.round(gpa)} / 100${hasRank ? `、专业排名前 ${inputs.rankPercentile}%` : ""}，具备优先维护推免竞争力的条件；仍需核对本校当年细则。`
    : route === "dual_track"
      ? `当前标准化绩点约 ${Math.round(gpa)} / 100${hasRank ? `、专业排名前 ${inputs.rankPercentile}%` : "，但未填写排名"}，建议在大三前同时保住课程成绩、科研证据和考研基础。`
      : `当前标准化绩点约 ${Math.round(gpa)} / 100${hasRank ? `、专业排名前 ${inputs.rankPercentile}%` : ""}，现阶段把可控资源集中到考研科目，同时继续改善排名并跟踪推免资格。`;
  return {
    route,
    label: labels[route],
    reason,
    confidence: hasRank ? "medium" as const : "low" as const,
  };
}

function phaseLabels(grade: number) {
  if (grade <= 1) return ["大一下—大二上", "大二上—大二下", "大二暑假—大三上", "大三下—大四"];
  if (grade === 2) return ["大二当前学期", "大二下—暑假", "大三上", "大三下—大四"];
  if (grade === 3) return ["大三当前学期", "大三上—寒假", "大三下", "大四"];
  return ["现在—4 周", "第 2—3 个月", "本学期结束前", "毕业前"];
}

function statusFor(index: number): LearningPathNode["status"] {
  return index <= 1 ? "now" : index <= 4 ? "next" : "later";
}

function node(input: Omit<LearningPathNode, "status">, index: number): LearningPathNode {
  return { ...input, status: statusFor(index) };
}

export function buildAlgorithmLearningPath(options: {
  inputs: LearningPathInputs;
  curriculum: CurriculumPlan | null;
  grade: number;
  major: string;
  now?: string;
}): LearningPathPlan {
  const { inputs, curriculum, grade, major } = options;
  const phases = phaseLabels(grade);
  const route = diagnoseGraduateRoute(inputs);
  const mathDone = hasCompleted(curriculum, ["calculus", "linearAlgebra"]);
  const programmingDone = hasCompleted(curriculum, ["programming"]);
  const researchStarter = inputs.researchExperience !== "none";
  const mathMatches = matchedCourses(curriculum, ["calculus", "linearAlgebra", "probability"]);
  const programmingMatches = matchedCourses(curriculum, ["programming", "dataStructure", "algorithm"]);
  const aiMatches = matchedCourses(curriculum, ["ai", "ml", "dl"]);
  const nodes: LearningPathNode[] = [
    node({
      id: "diagnose-foundation", phase: phases[0], semester: "第 1 周", title: "建立课程与目标差距表", kind: "career", durationWeeks: 1,
      why: curriculum ? `已从 ${curriculum.sourceName} 解析 ${curriculum.courses.length} 门课，先确定哪些校内课能直接服务算法工程师目标。` : "没有培养方案时无法判断课程先修关系，先补全课程表再安排课外学习。",
      actions: ["核对已修、在修、待修状态", "标出数学、编程、算法、AI 核心课", "记录本学期课程目标分数"],
      evidence: "一张课程差距表 + 本学期核心课目标分", courseMatches: [...mathMatches, ...programmingMatches, ...aiMatches].slice(0, 8), resourceIds: [],
    }, 0),
    node({
      id: "math-bridge", phase: phases[0], semester: "第 1—4 周", title: mathDone ? "把高数线代迁移到机器学习" : "补齐机器学习数学先修", kind: "course", durationWeeks: 4,
      why: mathDone ? "你已经学过高数和线代，不必从头重学；重点是把矩阵、梯度和概率用到模型推导。" : "算法课程会默认使用矩阵、导数和概率，缺口不补会导致只会调用框架。",
      actions: mathDone ? ["完成 MML 线代与微积分诊断题", "手推线性回归梯度", "用 NumPy 实现一次梯度下降"] : ["每周 2 次补矩阵与导数", "完成概率基础小测", "推导线性回归与逻辑回归"],
      evidence: "一份含推导、代码和错题的数学桥接 Notebook", courseMatches: mathMatches, resourceIds: ["mml-book"],
    }, 1),
    node({
      id: "programming-core", phase: phases[0], semester: "第 1—6 周", title: programmingDone ? "Python / 数据结构工程化补强" : "建立 Python 与数据结构基础", kind: "course", durationWeeks: 6,
      why: "算法工程师不仅要训练模型，还要能读写数据、定位错误并分析复杂度。",
      actions: ["用 Python 完成 20 道数据结构题", "掌握 NumPy 向量化与 Git", "给每周练习补 README 和测试"],
      evidence: "可运行的算法练习仓库，含复杂度说明与测试", courseMatches: programmingMatches, resourceIds: [],
    }, 2),
    node({
      id: "ml-foundation", phase: phases[1], semester: "连续 6—8 周", title: "机器学习基础 + 第一个基线", kind: "course", durationWeeks: 8,
      why: "先掌握数据划分、损失函数、过拟合和评估，再进入神经网络，学习顺序更稳。",
      actions: ["完成监督学习与模型评估模块", "用 scikit-learn 做一个公开数据集基线", "比较至少 3 个模型并解释误差"],
      evidence: "基线报告：问题、数据、方法、指标、误差分析", courseMatches: matchedCourses(curriculum, ["ml", "ai"]), resourceIds: ["ml-specialization", "sklearn"],
    }, 3),
    node({
      id: "deep-learning", phase: phases[1], semester: "机器学习基础后 8—12 周", title: "吴恩达神经网络课程 → PyTorch", kind: "course", durationWeeks: 12,
      why: "在机器学习与数学桥接完成后，再系统学习神经网络、优化、CNN 和序列模型。",
      actions: ["按顺序完成 Deep Learning Specialization 前 3 门", "用 PyTorch 重写一个作业模型", "记录训练曲线与失败实验"],
      evidence: "一个可复现实验仓库 + 训练日志 + 模型卡", courseMatches: aiMatches, resourceIds: ["dls", "pytorch", "d2l"],
    }, 4),
    node({
      id: "research-entry", phase: phases[1], semester: "本学期第 5—10 周", title: researchStarter ? "把已有科研变成可验证成果" : "进入科研：读论文、复现、找导师", kind: "research", durationWeeks: 6,
      why: "读研与算法岗位都看重能否围绕问题形成方法、实验与结论，而不是只收集课程证书。",
      actions: researchStarter ? ["把当前项目写成一页研究卡", "补齐基线与消融实验", "每两周向导师汇报一次"] : ["选一个细分方向读 3 篇综述/代表论文", "复现 1 个公开基线", "带着复现记录联系 2 位匹配导师"],
      evidence: researchStarter ? "研究卡 + 实验对照表 + 导师反馈" : "论文阅读矩阵 + 可运行复现 + 导师沟通记录", courseMatches: [], resourceIds: ["cs229", "d2l"],
    }, 5),
    node({
      id: "project-one", phase: phases[2], semester: "暑假前后 6—8 周", title: "完成一项端到端算法项目", kind: "project", durationWeeks: 8,
      why: "把课程知识串成数据、基线、模型、评估、部署或演示的完整闭环。",
      actions: ["从真实问题定义可量化指标", "先做简单基线再迭代深度模型", "公开代码、数据说明、结果与局限"],
      evidence: "Git 仓库 + 技术报告 + 5 分钟演示", courseMatches: [], resourceIds: ["pytorch", "d2l"],
    }, 6),
    node({
      id: "graduate-route", phase: phases[2], semester: "每月复核", title: route.label, kind: "graduate", durationWeeks: 16,
      why: route.reason,
      actions: route.route === "recommendation_first"
        ? ["每月更新专业排名与核心课成绩", "确认本校推免细则、材料与时间点", "同步准备英语和目标院校夏令营材料"]
        : route.route === "dual_track"
          ? ["课程成绩与科研各保留固定周时段", "大三上完成目标院校与考试科目表", "以学期节点决定是否切换考研主线"]
          : ["建立数学、英语、专业课周计划", "每 4 周完成一次阶段测评", "继续维护核心课成绩并跟踪推免资格"],
      evidence: "一张院校 / 导师 / 科目 / 截止日期决策表", courseMatches: matchedCourses(curriculum, ["english"]), resourceIds: [],
    }, 7),
    node({
      id: "research-output", phase: phases[2], semester: "大三上结束前", title: "形成科研或竞赛的可信产出", kind: "research", durationWeeks: 12,
      why: "有效科研经验是问题定义、实验贡献和复盘，不等同于挂名或只参加活动。",
      actions: ["明确个人承担部分", "完成基线、对照或误差分析", "争取论文、技术报告、竞赛作品或导师证明之一"],
      evidence: "可核验成果 + 个人贡献说明 + 导师反馈", courseMatches: [], resourceIds: ["deep-learning-book", "cs229"],
    }, 8),
    node({
      id: "specialization", phase: phases[3], semester: "大三下起", title: "选择一个算法方向深入", kind: "career", durationWeeks: 16,
      why: "在通用基础和一次完整项目之后，再选择 CV、NLP、推荐或多模态方向，避免过早追热点。",
      actions: ["精读 8—12 篇方向论文", "复现 2 个强基线", "把一个项目迭代到可答辩水平"],
      evidence: "方向知识图谱 + 两次复现 + 一项深度作品", courseMatches: aiMatches, resourceIds: ["d2l", "deep-learning-book"],
    }, 9),
    node({
      id: "final-portfolio", phase: phases[3], semester: "申请 / 复试 / 求职前", title: "把能力整理成申请与面试证据", kind: "career", durationWeeks: 4,
      why: "课程、科研和项目只有被清楚说明个人贡献与结果，才能支持读研申请和算法岗位面试。",
      actions: ["用问题—方法—贡献—结果重写 2 个项目", "准备数学、机器学习、深度学习问答", "完成 2 次技术答辩模拟"],
      evidence: "一页简历 + 项目作品集 + 模拟答辩反馈", courseMatches: [], resourceIds: [],
    }, 10),
  ];
  const edges = [
    ["diagnose-foundation", "math-bridge"], ["diagnose-foundation", "programming-core"],
    ["math-bridge", "ml-foundation"], ["programming-core", "ml-foundation"],
    ["ml-foundation", "deep-learning"], ["ml-foundation", "research-entry"],
    ["deep-learning", "project-one"], ["research-entry", "research-output"],
    ["project-one", "specialization"], ["graduate-route", "research-output"],
    ["research-output", "specialization"], ["specialization", "final-portfolio"],
  ].map(([from, to]) => ({ from, to }));
  return {
    targetRole: inputs.targetRole,
    objective: `${major} · ${grade <= 4 ? `大${["一", "二", "三", "四"][grade - 1]}` : "当前阶段"} → ${inputs.targetRole} → 研究生能力与申请准备`,
    route: route.route,
    routeLabel: route.label,
    routeReason: route.reason,
    routeConfidence: route.confidence,
    assumptions: [
      curriculum ? `依据已导入的 ${curriculum.courses.length} 门课程匹配先修基础。` : "尚未导入培养方案，课程匹配暂按计算机类通用结构估计。",
      "推免判断是规划启发式，不代表获得资格；最终以本校当年推免办法、排名口径和学院通知为准。",
      `按每周可用于课外成长的 ${inputs.weeklyHours} 小时安排；校内课程优先于重复网课。`,
    ],
    checkpoints: ["每 4 周检查学习产出，而不是只统计观看时长", "每学期更新绩点、专业排名和培养方案修读状态", "进入大三后按目标院校最新招生信息重新核对科目与截止日期"],
    nodes,
    edges,
    resources: algorithmResources,
    generatedAt: options.now ?? new Date().toISOString(),
    version: "algorithm-path-v1",
  };
}

export function learningPathToTasks(plan: LearningPathPlan): ActionTask[] {
  return plan.nodes.filter((item) => item.status === "now" || item.status === "next").map((item) => ({
    id: `learning-path-${item.id}`,
    title: item.title,
    detail: `${item.actions.join("；")}。完成标准：${item.evidence}`,
    category: item.kind === "course" ? "course" : item.kind === "project" ? "project" : item.kind === "research" ? "research" : "career",
    priority: item.status === "now" ? "high" : "medium",
    semester: item.semester,
    completed: false,
    sourceUrl: plan.resources.find((resource) => item.resourceIds.includes(resource.id))?.url,
    provenance: {
      generator: "rule",
      promptVersion: "curriculum-aware-algorithm-path-v1",
      ruleVersion: plan.version,
      model: "deterministic-rule-engine",
      generatedAt: plan.generatedAt,
      resourceIds: item.resourceIds,
      autonomous: true,
    },
  }));
}
