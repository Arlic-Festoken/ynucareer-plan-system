import type {
  AbilityKey,
  AbilityScores,
  Direction,
  JobProfile,
  Pathway,
  ResearchOutcome,
} from "../domain";

export const abilityLabels: Record<AbilityKey, string> = {
  communicationCollaboration: "沟通协作",
  innovativeThinking: "创新思维",
  professionalSkills: "专业技能",
  digitalLiteracy: "数字素养",
  responsibility: "责任担当",
  continuousLearning: "持续学习",
  resilience: "心理韧性",
};

export const blankAbilities: AbilityScores = {
  communicationCollaboration: 55,
  innovativeThinking: 50,
  professionalSkills: 55,
  digitalLiteracy: 55,
  responsibility: 55,
  continuousLearning: 55,
  resilience: 50,
};

export const majors = ["计算机科学与技术", "通信工程", "智能科学与技术", "物联网工程", "电子信息工程"];
export const interestOptions = ["人工智能", "数据与商业", "教育创新", "智慧医疗", "产品设计", "公共服务"];
export const valueOptions = ["创造价值", "技术精进", "社会贡献", "稳定成长", "持续探索", "团队协作"];

export const policyConnections = [
  { policy: "数字中国", industry: "数字经济", major: "计算机科学与技术", opportunity: "智能应用、软件工程与数据服务" },
  { policy: "新型工业化", industry: "智能制造", major: "通信工程", opportunity: "工业互联网与边缘智能" },
  { policy: "新型工业化", industry: "智能制造", major: "智能科学与技术", opportunity: "智能感知、机器学习与工业智能" },
  { policy: "数字中国", industry: "物联网与智慧城市", major: "物联网工程", opportunity: "物联感知、边缘计算与城市服务" },
  { policy: "新型工业化", industry: "电子信息产业", major: "电子信息工程", opportunity: "嵌入式系统、通信设备与智能终端" },
  { policy: "教育数字化战略", industry: "教育科技", major: "教育技术学", opportunity: "学习分析与智能教学产品" },
  { policy: "健康中国", industry: "智慧医疗", major: "数据科学与大数据技术", opportunity: "医疗数据治理与辅助决策" },
];

export const directions: Direction[] = [
  {
    id: "ai-builder",
    title: "AI 应用开发",
    summary: "把模型能力转化为真实场景中的工具与服务，适合偏好技术创造和项目落地的同学。",
    interests: ["人工智能", "智慧医疗"],
    values: ["技术精进", "创造价值"],
    starterTasks: [
      { title: "完成一个 API 调用小作品", detail: "选择校园问答或学习辅助场景，记录问题、方案和结果。", category: "project", priority: "high" },
      { title: "建立 AI 应用案例夹", detail: "每周拆解一款 AI 产品的用户、流程与边界。", category: "reflection", priority: "medium" },
    ],
  },
  {
    id: "data-decider",
    title: "数据分析与决策支持",
    summary: "用数据解释现象、支持决策，适合关注业务问题和社会议题的同学。",
    interests: ["数据与商业", "公共服务"],
    values: ["社会贡献", "持续探索"],
    starterTasks: [
      { title: "完成校园数据可视化", detail: "从公开数据中提出一个问题并制作可复用图表。", category: "project", priority: "high" },
      { title: "学习 SQL 基础", detail: "完成查询、聚合和指标计算练习。", category: "course", priority: "medium" },
    ],
  },
  {
    id: "edtech-product",
    title: "教育科技产品",
    summary: "用技术改善学习体验，适合关注用户、设计和教育创新的同学。",
    interests: ["教育创新", "产品设计"],
    values: ["社会贡献", "团队协作"],
    starterTasks: [
      { title: "完成学习场景观察卡", detail: "选择一个课堂或学习工具场景，记录目标、障碍与改进想法。", category: "practice", priority: "high" },
      { title: "制作低保真原型", detail: "将一个学习场景绘制为三页可讲述的交互原型。", category: "project", priority: "medium" },
    ],
  },
];

export const jobs: JobProfile[] = [
  {
    id: "data-analyst",
    title: "数据分析师",
    industry: "数字经济 / 教育科技 / 智慧医疗",
    description: "负责数据清洗、指标体系建设、可视化分析与业务决策支持。",
    requiredAbilities: { communicationCollaboration: 72, innovativeThinking: 68, professionalSkills: 76, digitalLiteracy: 84, responsibility: 72, continuousLearning: 70, resilience: 64 },
    weights: { digitalLiteracy: 1.5, professionalSkills: 1.35, communicationCollaboration: 1.15 },
    resources: ["SQL 进阶练习", "数据可视化课程", "校园调研项目"],
  },
  {
    id: "ai-engineer",
    title: "AI 应用开发工程师",
    industry: "人工智能 / 智能制造 / 智慧医疗",
    description: "将模型能力接入真实业务场景，完成应用开发、评估与产品化。",
    requiredAbilities: { communicationCollaboration: 68, innovativeThinking: 82, professionalSkills: 88, digitalLiteracy: 86, responsibility: 76, continuousLearning: 82, resilience: 70 },
    weights: { professionalSkills: 1.5, innovativeThinking: 1.4, digitalLiteracy: 1.3 },
    resources: ["Python 工程化课程", "模型应用作品集", "开源项目协作"],
  },
  {
    id: "product-manager",
    title: "教育科技产品经理",
    industry: "教育科技 / 数字化服务",
    description: "洞察学习场景，设计数字产品并推动数据驱动的迭代。",
    requiredAbilities: { communicationCollaboration: 88, innovativeThinking: 78, professionalSkills: 66, digitalLiteracy: 72, responsibility: 82, continuousLearning: 76, resilience: 72 },
    weights: { communicationCollaboration: 1.5, responsibility: 1.35, innovativeThinking: 1.25 },
    resources: ["用户研究入门", "产品设计工作坊", "教育场景实践"],
  },
];

export const pathwayGuidance: Record<Pathway, { label: string; description: string; tasks: string[] }> = {
  employment: { label: "就业", description: "围绕目标岗位积累作品、实习和表达证据。", tasks: ["完成一份针对岗位的作品说明", "参加一次模拟面试", "建立投递与复盘清单"] },
  recommendation: { label: "推免", description: "围绕成绩、科研、竞赛与导师沟通建立长期准备节奏。", tasks: ["梳理推免条件与时间点", "完善科研或竞赛成果档案", "制定导师沟通计划"] },
  postgraduate: { label: "考研", description: "以目标院校、专业课与复试能力为主线安排阶段学习。", tasks: ["确定目标院校与参考书", "建立三轮复习计划", "准备复试项目与表达材料"] },
  "civil-service": { label: "考公", description: "同步理解岗位要求、行测申论训练和个人经历表达。", tasks: ["筛选符合专业与地域的岗位", "制定行测专项训练", "沉淀基层实践与材料素材"] },
};

export const researchIndustries = [
  { research: "人工智能与机器学习", industries: ["智能制造", "智慧医疗", "教育科技"] },
  { research: "通信与网络", industries: ["工业互联网", "车联网", "低空经济"] },
  { research: "数据治理与分析", industries: ["公共服务", "金融科技", "健康管理"] },
];

export const researchOutcomeLabels: Record<ResearchOutcome["type"], string> = {
  paper: "论文",
  patent: "专利",
  project: "项目",
  competition: "竞赛",
};

export type CohortRecord = { stage: "低年级" | "高年级" | "研究生"; major: string; pathway: Pathway; interest: string; completion: number; gap: string };
export const cohortRecords: CohortRecord[] = [
  { stage: "低年级", major: "计算机科学与技术", pathway: "employment", interest: "人工智能", completion: 76, gap: "行业认知" },
  { stage: "低年级", major: "通信工程", pathway: "postgraduate", interest: "智慧医疗", completion: 61, gap: "生涯规划" },
  { stage: "低年级", major: "教育技术学", pathway: "employment", interest: "教育创新", completion: 72, gap: "项目经验" },
  { stage: "高年级", major: "数据科学与大数据技术", pathway: "employment", interest: "数据与商业", completion: 68, gap: "项目经验" },
  { stage: "高年级", major: "计算机科学与技术", pathway: "recommendation", interest: "人工智能", completion: 83, gap: "沟通表达" },
  { stage: "高年级", major: "通信工程", pathway: "civil-service", interest: "公共服务", completion: 64, gap: "行业认知" },
  { stage: "研究生", major: "计算机科学与技术", pathway: "employment", interest: "人工智能", completion: 79, gap: "生涯规划" },
  { stage: "研究生", major: "数据科学与大数据技术", pathway: "postgraduate", interest: "智慧医疗", completion: 74, gap: "沟通表达" },
  { stage: "研究生", major: "教育技术学", pathway: "employment", interest: "教育创新", completion: 81, gap: "行业认知" },
];
