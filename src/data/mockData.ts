import type {
  AdminOverview,
  AwakeningStep,
  GrowthRoadmap,
  JobProfile,
  MatchResult,
  StudentProfile,
} from "../types";

export const students: Record<"freshman" | "junior", StudentProfile> = {
  freshman: {
    id: "stu-1001",
    name: "陈同学",
    grade: 1,
    major: "计算机科学与技术",
    stage: "exploration",
    careerAwakeningScore: 46,
    targetDirections: ["人工智能", "智慧医疗", "数据智能"],
    abilityScores: {
      professionalFoundation: 58,
      programming: 62,
      dataAnalysis: 54,
      projectExperience: 36,
      communication: 66,
      industryKnowledge: 42,
      careerPlanning: 45,
    },
  },
  junior: {
    id: "stu-3007",
    name: "林同学",
    grade: 3,
    major: "计算机科学与技术",
    stage: "decision",
    careerAwakeningScore: 76,
    targetDirections: ["数据分析师", "AI应用开发工程师"],
    abilityScores: {
      professionalFoundation: 78,
      programming: 74,
      dataAnalysis: 72,
      projectExperience: 61,
      communication: 64,
      industryKnowledge: 58,
      careerPlanning: 70,
    },
  },
};

export const awakeningSteps: AwakeningStep[] = [
  {
    step: 1,
    title: "中国人的生涯观",
    subtitle: "修身、立业、报国、创造",
    description: "把个人发展放入社会需要与国家战略之中，形成更稳定的生涯意义感。",
    interactionType: "card",
    output: "形成中国化生涯观认知框架",
  },
  {
    step: 2,
    title: "国家发展战略与你的专业",
    subtitle: "专业、产业、政策、岗位关联",
    description: "理解计算机专业如何参与数字中国、人工智能+、智慧医疗与教育数字化。",
    interactionType: "graph",
    output: "识别专业可进入的战略方向",
  },
  {
    step: 3,
    title: "个人生涯发展内驱力",
    subtitle: "轻量化内驱力评估",
    description: "通过选择题生成探索动机、成就动机、技术兴趣、社会价值感等画像。",
    interactionType: "assessment",
    output: "生成内驱力雷达图",
  },
  {
    step: 4,
    title: "展望你的生涯愿景",
    subtitle: "关键词与未来工作场景",
    description: "把模糊期待整理成可表达的愿景摘要，为下一步方向生成做准备。",
    interactionType: "vision-board",
    output: "形成个人生涯愿景摘要",
  },
  {
    step: 5,
    title: "设计你的生涯愿景",
    subtitle: "从愿景到方向选项",
    description: "把愿景转译为 AI 应用开发、医疗人工智能、数据分析等可探索方向。",
    interactionType: "direction-generator",
    output: "推荐 3 个可验证方向",
  },
  {
    step: 6,
    title: "用行动创造结果",
    subtitle: "下学期探索行动清单",
    description: "生成课程、项目、竞赛、阅读与反思行动，推动低年级学生开始真实探索。",
    interactionType: "action-plan",
    output: "生成探索行动计划",
  },
];

export const jobs: JobProfile[] = [
  {
    id: "data-analyst",
    title: "数据分析师",
    industry: "数字经济 / 教育科技 / 智慧医疗",
    description: "负责数据清洗、指标体系建设、可视化分析与业务决策支持。",
    requiredAbilities: {
      professionalFoundation: 78,
      programming: 76,
      dataAnalysis: 88,
      projectExperience: 80,
      communication: 78,
      industryKnowledge: 74,
      careerPlanning: 70,
    },
    weight: {
      dataAnalysis: 1.3,
      projectExperience: 1.15,
      communication: 1.1,
      programming: 1,
    },
    recommendedCourses: ["数据库原理", "数据可视化", "统计分析与建模"],
    recommendedProjects: ["校园消费数据看板", "就业岗位需求分析", "医疗数据指标探索"],
  },
  {
    id: "ai-engineer",
    title: "AI应用开发工程师",
    industry: "人工智能 / 智能制造",
    description: "面向真实业务场景完成模型调用、应用开发、评估和产品化落地。",
    requiredAbilities: {
      professionalFoundation: 82,
      programming: 88,
      dataAnalysis: 78,
      projectExperience: 84,
      communication: 70,
      industryKnowledge: 72,
      careerPlanning: 68,
    },
    weight: {
      programming: 1.35,
      projectExperience: 1.25,
      professionalFoundation: 1.1,
    },
    recommendedCourses: ["机器学习", "软件工程", "深度学习基础"],
    recommendedProjects: ["AI 学习助手", "校园问答机器人", "图像识别小应用"],
  },
  {
    id: "product-manager",
    title: "教育技术产品经理",
    industry: "教育数字化",
    description: "围绕学习场景调研需求、设计产品方案，并推动数据驱动的产品迭代。",
    requiredAbilities: {
      professionalFoundation: 70,
      programming: 60,
      dataAnalysis: 74,
      projectExperience: 76,
      communication: 86,
      industryKnowledge: 84,
      careerPlanning: 76,
    },
    weight: {
      communication: 1.35,
      industryKnowledge: 1.25,
      dataAnalysis: 1.05,
    },
    recommendedCourses: ["教育技术导论", "用户研究", "产品数据分析"],
    recommendedProjects: ["课程反馈系统原型", "学习行为分析报告", "教学工具需求调研"],
  },
];

export const matchResults: MatchResult[] = [
  {
    studentId: "stu-3007",
    jobId: "data-analyst",
    matchScore: 82,
    readinessLevel: "中高",
    percentile: 42,
    projectedPercentile: 28,
    gaps: [
      {
        ability: "SQL 数据处理能力",
        current: 62,
        required: 80,
        gap: 18,
        impact: "高",
        explanation:
          "数据分析岗位通常要求独立完成数据清洗、聚合查询与指标构建。当前已具备基础，但复杂查询和业务指标转化仍需强化。",
      },
      {
        ability: "真实项目表达",
        current: 61,
        required: 80,
        gap: 19,
        impact: "高",
        explanation:
          "目前项目数量足够支撑入门展示，但需要把背景、方法、指标和结果整理成可面试表达的作品材料。",
      },
      {
        ability: "商业分析表达",
        current: 64,
        required: 78,
        gap: 14,
        impact: "中",
        explanation:
          "需要从技术结果进一步转向决策建议，训练用业务语言解释数据发现和行动建议。",
      },
    ],
    summary:
      "综合判断：你与数据分析师岗位具有较高适配潜力，但目前仍处于能力补齐型阶段。建议优先提升 SQL、数据可视化和真实项目表达能力，再进入简历投递与面试训练阶段。",
  },
];

export const roadmap: GrowthRoadmap = {
  targetJob: "数据分析师",
  semesters: [
    {
      name: "大三上",
      goal: "补齐数据分析基础能力",
      tasks: [
        {
          type: "课程",
          title: "修读《数据库原理》《数据可视化》并完成课程项目",
          priority: "高",
          expectedOutcome: "建立 SQL 查询、指标构建和图表表达基础",
        },
        {
          type: "项目",
          title: "完成一个 Excel / Python 校园数据分析项目",
          priority: "高",
          expectedOutcome: "产出 1 份可展示的数据分析报告",
        },
        {
          type: "实践",
          title: "参加校内数据分析训练营",
          priority: "中",
          expectedOutcome: "熟悉岗位常用分析流程和工具链",
        },
      ],
    },
    {
      name: "大三下",
      goal: "形成项目证明材料",
      tasks: [
        {
          type: "竞赛",
          title: "参加数学建模或市场调研竞赛",
          priority: "高",
          expectedOutcome: "形成团队协作、建模与报告表达证据",
        },
        {
          type: "项目",
          title: "完成一个真实数据看板项目",
          priority: "高",
          expectedOutcome: "沉淀可放入简历的仪表板作品",
        },
        {
          type: "实践",
          title: "访谈 2 名数据分析岗位学长或行业从业者",
          priority: "中",
          expectedOutcome: "校准岗位要求与个人能力差距",
        },
      ],
    },
    {
      name: "大四上",
      goal: "求职冲刺与岗位转化",
      tasks: [
        {
          type: "求职",
          title: "完成数据分析岗位简历定制",
          priority: "高",
          expectedOutcome: "形成 2 个岗位版本的简历与项目叙事",
        },
        {
          type: "求职",
          title: "进行 3 次模拟面试和 1 次作品集复盘",
          priority: "高",
          expectedOutcome: "提升项目表达、SQL 问答和业务分析呈现",
        },
        {
          type: "实践",
          title: "投递数据分析实习或秋招岗位",
          priority: "中",
          expectedOutcome: "完成首轮投递反馈闭环",
        },
      ],
    },
  ],
};

export const adminOverview: AdminOverview = {
  pilotStudents: 218,
  awakeningAverage: 61.4,
  matchAverage: 74.8,
  commonWeaknesses: ["项目经验", "沟通表达", "行业认知"],
  recommendedCourses: ["数据分析基础", "职业表达训练", "项目实践工作坊"],
  interestDistribution: [
    { name: "AI技术方向", value: 32 },
    { name: "数据分析方向", value: 24 },
    { name: "产品与运营方向", value: 18 },
    { name: "教育技术方向", value: 14 },
    { name: "其他方向", value: 12 },
  ],
  matchDistribution: [
    { name: "高适配", value: 23 },
    { name: "中适配", value: 51 },
    { name: "低适配", value: 26 },
  ],
  heatmap: [
    { major: "计科大一", ability: "行业认知", score: 73 },
    { major: "计科大一", ability: "项目经验", score: 82 },
    { major: "计科大二", ability: "职业表达", score: 68 },
    { major: "计科大三", ability: "项目经验", score: 78 },
    { major: "软件大三", ability: "沟通表达", score: 64 },
    { major: "信管大四", ability: "求职材料", score: 71 },
  ],
  suggestions: [
    "面向大一开设“专业与国家战略导论”微课程",
    "面向大二组织 AI+行业案例工作坊",
    "面向大三强化项目制实践与岗位能力训练",
    "面向大四建立求职材料诊断与模拟面试机制",
  ],
};

export const motivationRadar = [
  { subject: "探索动机", value: 78, fullMark: 100 },
  { subject: "成就动机", value: 84, fullMark: 100 },
  { subject: "社会价值感", value: 72, fullMark: 100 },
  { subject: "技术兴趣", value: 91, fullMark: 100 },
  { subject: "稳定偏好", value: 56, fullMark: 100 },
];

export const abilityLabels: Record<string, string> = {
  professionalFoundation: "专业基础",
  programming: "编程实现",
  dataAnalysis: "数据分析",
  projectExperience: "项目经验",
  communication: "沟通表达",
  industryKnowledge: "行业认知",
  careerPlanning: "求职材料",
};
