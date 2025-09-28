export interface Task {
  id: string;
  title: string;
  note?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueAt?: Date | null;
  estimatePomos: number;
  completedPomos: number;
  isDone: boolean;
  projectId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  taskCount?: number;
  completedCount?: number;
}

export const projects: Project[] = [
  { id: "work", name: "WORK", color: "#3B82F6", taskCount: 0, completedCount: 0 },
  { id: "study", name: "STUDY", color: "#10B981", taskCount: 0, completedCount: 0 },
  { id: "develop", name: "DEVELOP", color: "#8B5CF6", taskCount: 0, completedCount: 0 },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

export const dummyTasks: Task[] = [
  // WORK プロジェクトのタスク
  {
    id: "1",
    title: "mtg 課金の仕組みを導入する",
    note: "ユーザー課金システムの実装について話し合う",
    priority: "HIGH",
    dueAt: today,
    estimatePomos: 2,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "タスク管理アプリ作成",
    note: "React + TypeScriptで実装",
    priority: "MEDIUM",
    dueAt: tomorrow,
    estimatePomos: 6,
    completedPomos: 2,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    title: "dbがどうなっているか　アカウントを作成し、UIを確認",
    note: "データベース構造の確認とテストアカウント作成",
    priority: "MEDIUM",
    dueAt: today,
    estimatePomos: 1,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "4",
    title: "Instagramのアプリを作成",
    note: "SNSクローンアプリの開発",
    priority: "LOW",
    dueAt: nextWeek,
    estimatePomos: 8,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
  },
  {
    id: "5",
    title: "discord API　　1日に登録した、チャンネルのYoutubeの動画を見る　売了したかどうかをラインする",
    note: "Discord botの実装",
    priority: "LOW",
    dueAt: null,
    estimatePomos: 4,
    completedPomos: 1,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-11"),
    updatedAt: new Date("2024-01-11"),
  },
  {
    id: "6",
    title: "拡張機能：リロードするとバグる問題",
    note: "Chrome拡張のバグ修正",
    priority: "HIGH",
    dueAt: today,
    estimatePomos: 2,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "7",
    title: "拡張機能のプライバシーポリシーページをwpで作成する　非公開ページ？　リンクを知っている人だけジャンプできるようにする",
    note: "WordPressでプライバシーポリシーページを作成",
    priority: "MEDIUM",
    dueAt: tomorrow,
    estimatePomos: 3,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-09"),
    updatedAt: new Date("2024-01-09"),
  },
  {
    id: "8",
    title: "コーヒーアプリ",
    note: "コーヒー記録アプリの開発",
    priority: "LOW",
    dueAt: null,
    estimatePomos: 5,
    completedPomos: 0,
    isDone: false,
    projectId: "work",
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-08"),
  },

  // STUDY プロジェクトのタスク
  {
    id: "9",
    title: "TypeScriptの型システムを学習",
    note: "ジェネリクス、ユーティリティ型を中心に",
    priority: "HIGH",
    dueAt: today,
    estimatePomos: 3,
    completedPomos: 1,
    isDone: false,
    projectId: "study",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "10",
    title: "Next.js 14のApp Routerを習得",
    note: "Server ComponentsとClient Componentsの使い分け",
    priority: "MEDIUM",
    dueAt: tomorrow,
    estimatePomos: 4,
    completedPomos: 2,
    isDone: false,
    projectId: "study",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "11",
    title: "GraphQL入門",
    note: "Apollo ClientとServer実装",
    priority: "LOW",
    dueAt: nextWeek,
    estimatePomos: 5,
    completedPomos: 0,
    isDone: false,
    projectId: "study",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "12",
    title: "Docker基礎",
    note: "コンテナ化とdocker-compose",
    priority: "MEDIUM",
    dueAt: null,
    estimatePomos: 3,
    completedPomos: 0,
    isDone: false,
    projectId: "study",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
  },

  // DEVELOP プロジェクトのタスク
  {
    id: "13",
    title: "ポートフォリオサイト作成",
    note: "個人サイトのリニューアル",
    priority: "HIGH",
    dueAt: tomorrow,
    estimatePomos: 8,
    completedPomos: 3,
    isDone: false,
    projectId: "develop",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "14",
    title: "ブログ機能の実装",
    note: "MDXを使った記事管理",
    priority: "MEDIUM",
    dueAt: nextWeek,
    estimatePomos: 6,
    completedPomos: 1,
    isDone: false,
    projectId: "develop",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "15",
    title: "CI/CDパイプライン構築",
    note: "GitHub ActionsでのデプロイE自動化",
    priority: "LOW",
    dueAt: null,
    estimatePomos: 4,
    completedPomos: 0,
    isDone: false,
    projectId: "develop",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },

  // 完了済みのタスク
  {
    id: "16",
    title: "プレゼン資料作成",
    note: "月次報告用",
    priority: "HIGH",
    dueAt: yesterday,
    estimatePomos: 2,
    completedPomos: 2,
    isDone: true,
    projectId: "work",
    createdAt: new Date("2024-01-07"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "17",
    title: "コードレビュー",
    note: "PRのレビューと承認",
    priority: "MEDIUM",
    dueAt: yesterday,
    estimatePomos: 1,
    completedPomos: 1,
    isDone: true,
    projectId: "work",
    createdAt: new Date("2024-01-06"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "18",
    title: "テスト作成",
    note: "ユニットテストとE2Eテスト",
    priority: "HIGH",
    dueAt: lastWeek,
    estimatePomos: 4,
    completedPomos: 4,
    isDone: true,
    projectId: "develop",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-12"),
  },
  {
    id: "19",
    title: "認証機能実装",
    note: "NextAuthでのOAuth実装",
    priority: "HIGH",
    dueAt: lastWeek,
    estimatePomos: 5,
    completedPomos: 5,
    isDone: true,
    projectId: "develop",
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date("2024-01-11"),
  },
  {
    id: "20",
    title: "データベース設計",
    note: "Prismaスキーマ定義",
    priority: "HIGH",
    dueAt: lastWeek,
    estimatePomos: 3,
    completedPomos: 3,
    isDone: true,
    projectId: "develop",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-10"),
  },
];

// プロジェクトごとのタスク数を更新
projects.forEach(project => {
  const projectTasks = dummyTasks.filter(task => task.projectId === project.id);
  project.taskCount = projectTasks.length;
  project.completedCount = projectTasks.filter(task => task.isDone).length;
});