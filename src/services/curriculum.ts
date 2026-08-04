import type { CurriculumCourse, CurriculumCourseStatus, CurriculumPlan } from "../domain";

const headerAliases = {
  name: ["课程名称", "课程名", "课程", "name", "course"],
  semester: ["开课学期", "建议学期", "学期", "semester", "term"],
  credits: ["学分", "credits", "credit"],
  category: ["课程性质", "课程类别", "类别", "category", "type"],
  status: ["修读状态", "状态", "status"],
  score: ["成绩", "分数", "score", "grade"],
} as const;

const statusWords: Record<string, CurriculumCourseStatus> = {
  已修: "completed",
  已完成: "completed",
  completed: "completed",
  当前: "current",
  在修: "current",
  current: "current",
  计划: "planned",
  待修: "planned",
  planned: "planned",
};

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function findHeaderIndex(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header.trim().toLowerCase() === alias.toLowerCase()));
}

function semesterNumber(value: string) {
  const compact = value.replace(/\s/g, "");
  const gradeMatch = compact.match(/大([一二三四1234])([上下])/);
  if (gradeMatch) {
    const gradeMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4 };
    const grade = gradeMap[gradeMatch[1]] ?? Number(gradeMatch[1]);
    return (grade - 1) * 2 + (gradeMatch[2] === "上" ? 1 : 2);
  }
  const numeric = compact.match(/(?:第)?([1-8])(?:学期)?/);
  return numeric ? Number(numeric[1]) : null;
}

function normalizeSemester(value: unknown, index: number) {
  const raw = String(value ?? "").trim();
  const number = semesterNumber(raw);
  if (number) return `第 ${number} 学期`;
  return raw || `未标注学期 ${index + 1}`;
}

function inferStatus(raw: unknown, semester: string, currentGrade: number): CurriculumCourseStatus {
  const normalized = String(raw ?? "").trim().toLowerCase();
  if (statusWords[normalized]) return statusWords[normalized];
  const number = semesterNumber(semester);
  if (!number) return "planned";
  const currentSemester = Math.max(1, Math.min(8, currentGrade * 2 - 1));
  if (number < currentSemester) return "completed";
  if (number <= currentSemester + 1) return "current";
  return "planned";
}

function numberOrNull(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && String(value ?? "").trim() ? parsed : null;
}

function buildCourse(row: Record<string, unknown>, index: number, currentGrade: number): CurriculumCourse | null {
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  const semester = normalizeSemester(row.semester, index);
  return {
    id: `curriculum-${index + 1}-${name.replace(/\s+/g, "-").slice(0, 24)}`,
    name,
    semester,
    credits: numberOrNull(row.credits),
    category: String(row.category ?? "未分类").trim() || "未分类",
    status: inferStatus(row.status, semester, currentGrade),
    score: numberOrNull(row.score),
  };
}

function rowsFromJson(text: string) {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { courses?: unknown }).courses)
      ? (parsed as { courses: unknown[] }).courses
      : null;
  if (!rows) throw new Error("JSON 需要是课程数组，或包含 courses 数组。");
  return rows.map((item) => {
    const source = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const read = (key: keyof typeof headerAliases) => {
      const alias = headerAliases[key].find((candidate) => candidate in source);
      return alias ? source[alias] : source[key];
    };
    return {
      name: read("name"),
      semester: read("semester"),
      credits: read("credits"),
      category: read("category"),
      status: read("status"),
      score: read("score"),
    };
  });
}

function rowsFromDelimitedText(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("文件至少需要一行表头和一行课程。");
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : lines[0].includes(";") ? ";" : "";
  if (!delimiter) {
    return lines.map((line) => {
      const [name, semester = "", credits = "", category = "", status = "", score = ""] = line.split(/\s{2,}|\|/).map((cell) => cell.trim());
      return { name, semester, credits, category, status, score };
    });
  }
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const indices = Object.fromEntries(Object.entries(headerAliases).map(([key, aliases]) => [key, findHeaderIndex(headers, aliases)])) as Record<keyof typeof headerAliases, number>;
  if (indices.name < 0) throw new Error("没有找到“课程名称”列。请使用下载的模板表头。");
  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const value = (key: keyof typeof headerAliases) => indices[key] >= 0 ? cells[indices[key]] : "";
    return {
      name: value("name"),
      semester: value("semester"),
      credits: value("credits"),
      category: value("category"),
      status: value("status"),
      score: value("score"),
    };
  });
}

export function parseCurriculum(text: string, options: { fileName: string; major: string; currentGrade: number; now?: string }): CurriculumPlan {
  if (text.length > 2_000_000) throw new Error("文件超过 2 MB，请只保留课程表部分。");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("文件内容为空。");
  const rows = trimmed.startsWith("{") || trimmed.startsWith("[") ? rowsFromJson(trimmed) : rowsFromDelimitedText(trimmed);
  const courses = rows.map((row, index) => buildCourse(row, index, options.currentGrade)).filter((course): course is CurriculumCourse => Boolean(course));
  if (!courses.length) throw new Error("没有解析出课程，请检查表头和内容。");
  if (courses.length > 240) throw new Error("课程数量超过 240 门，请检查是否导入了无关表格。");
  return {
    title: `${options.major}培养方案`,
    major: options.major,
    entryYear: new Date().getFullYear() - Math.max(0, options.currentGrade - 1),
    sourceName: options.fileName,
    importedAt: options.now ?? new Date().toISOString(),
    courses,
  };
}

export function buildSampleCurriculum(major: string, currentGrade: number, now?: string): CurriculumPlan {
  const sample = `课程名称,学期,学分,课程性质,状态,成绩
高等数学 A1,第 1 学期,5,专业基础,已修,86
程序设计基础,第 1 学期,4,专业基础,已修,90
高等数学 A2,第 2 学期,5,专业基础,已修,84
线性代数,第 2 学期,3,专业基础,已修,88
离散数学,第 2 学期,3,专业基础,已修,82
数据结构,第 3 学期,4,专业核心,在修,
概率论与数理统计,第 3 学期,3,专业基础,在修,
计算机组成原理,第 3 学期,4,专业核心,在修,
算法设计与分析,第 4 学期,3,专业核心,待修,
数据库系统,第 4 学期,3,专业核心,待修,
操作系统,第 5 学期,4,专业核心,待修,
计算机网络,第 5 学期,4,专业核心,待修,
人工智能导论,第 5 学期,3,专业方向,待修,
机器学习,第 6 学期,3,专业方向,待修,
深度学习,第 6 学期,3,专业方向,待修,
毕业设计,第 8 学期,8,综合实践,待修,`;
  return parseCurriculum(sample, { fileName: "计算机类示例培养方案.csv", major, currentGrade, now });
}

export const curriculumTemplate = `课程名称,学期,学分,课程性质,状态,成绩
高等数学,第 1 学期,5,专业基础,已修,86
线性代数,第 2 学期,3,专业基础,已修,88
数据结构,第 3 学期,4,专业核心,在修,
机器学习,第 6 学期,3,专业方向,待修,`;
