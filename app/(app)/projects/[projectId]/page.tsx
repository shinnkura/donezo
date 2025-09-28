"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Calendar,
  Clock,
  Flag,
  CheckSquare,
  Trash2,
  Edit,
  FolderOpen,
  Target,
  TrendingUp,
  MoreHorizontal,
  Bell,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  note?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueAt?: Date | null;
  estimatePomos: number;
  completedPomos: number;
  isDone: boolean;
  projectId?: string | null;
  project?: Project | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectData: { [key: string]: { name: string; color: string; description: string } } = {
  work: { name: "WORK", color: "#3B82F6", description: "仕事関連のタスク" },
  study: { name: "STUDY", color: "#10B981", description: "学習関連のタスク" },
  develop: { name: "DEVELOP", color: "#8B5CF6", description: "開発プロジェクト" },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // 新規タスクフォームの状態
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    estimatePomos: 1,
    dueAt: "",
  });

  // プロジェクト情報
  const project = projectData[projectId] || { name: projectId.toUpperCase(), color: "#6B7280", description: "" };

  // タスクを取得
  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getTasks" }),
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      // プロジェクトIDでフィルタリング
      const projectTasks = data.tasks?.filter((task: Task) => task.projectId === projectId) || [];
      setTasks(projectTasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast({
        title: "エラー",
        description: "タスクの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createTask",
          ...newTask,
          projectId: projectId,
          dueAt: newTask.dueAt || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      const data = await response.json();
      if (data.task) {
        setTasks([data.task, ...tasks]);
        setIsCreateDialogOpen(false);
        setNewTask({
          title: "",
          note: "",
          priority: "MEDIUM",
          estimatePomos: 1,
          dueAt: "",
        });
        toast({
          title: "成功",
          description: "タスクを作成しました",
        });
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      toast({
        title: "エラー",
        description: "タスクの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleTaskDone",
          taskId,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle task");

      const data = await response.json();
      if (data.task) {
        setTasks(tasks.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
      toast({
        title: "エラー",
        description: "タスクの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTask",
          taskId,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete task");

      setTasks(tasks.filter((t) => t.id !== taskId));
      toast({
        title: "成功",
        description: "タスクを削除しました",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        title: "エラー",
        description: "タスクの削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.isDone);
  const completedTasks = tasks.filter((t) => t.isDone);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const totalEstimatePomos = tasks.reduce((acc, task) => acc + task.estimatePomos, 0);
  const totalCompletedPomos = tasks.reduce((acc, task) => acc + task.completedPomos, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "高";
      case "MEDIUM":
        return "中";
      case "LOW":
        return "低";
      default:
        return priority;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* プロジェクトヘッダー */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: project.color + "20" }}
            >
              <FolderOpen className="h-5 w-5" style={{ color: project.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Users className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  プロジェクトを編集
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  リンクをコピー
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  プロジェクトを削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-auto p-6">
          {/* 統計カード */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{incompleteTasks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">予定時間</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{incompleteTasks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">未完了のタスク</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-baseline">
                  <div className="text-2xl font-bold">{totalCompletedPomos}</div>
                  <span className="text-sm text-muted-foreground ml-1">時間</span>
                  <div className="text-2xl font-bold ml-2">{totalEstimatePomos - totalCompletedPomos}</div>
                  <span className="text-sm text-muted-foreground ml-1">分</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">実行済みの時間</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{completedTasks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">完了済みのタスク</p>
              </CardContent>
            </Card>
          </div>

          {/* タスク入力フィールド */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`"${project.name}"に追加したいタスク名を入力してください。「リターンキー」を押して保存して下さい`}
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setNewTask({ ...newTask, title: e.currentTarget.value });
                      createTask();
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* タスクリスト */}
          <div className="space-y-2">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">読み込み中...</p>
                  </div>
                </CardContent>
              </Card>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">タスクがありません</h3>
                <p className="text-muted-foreground">新しいタスクを追加して始めましょう。</p>
              </div>
            ) : (
              <>
                {incompleteTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group"
                  >
                    <Checkbox
                      checked={task.isDone}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{task.title}</span>
                        <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                          {task.estimatePomos}P
                        </Badge>
                      </div>
                      {task.note && (
                        <p className="text-xs text-muted-foreground mt-1">{task.note}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {completedTasks.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground mt-4 mb-2">完了済みのタスク</div>
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group opacity-60"
                      >
                        <Checkbox
                          checked={task.isDone}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="h-5 w-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium line-through">{task.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 右サイドバー */}
        <div className="w-80 border-l bg-background p-6 overflow-auto">
          <div className="space-y-6">
            {/* ポモドーロタイマー */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ポモドーロ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-4">25:00</div>
                  <Button className="w-full" style={{ backgroundColor: project.color }}>
                    開始
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* プロジェクト情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">プロジェクト</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">進捗状況</p>
                  <Progress value={completionRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(completionRate)}% 完了
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">期限</p>
                  <p className="text-sm">なし</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">メンバー</p>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* リマインダー */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">リマインダー</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">なし</p>
              </CardContent>
            </Card>

            {/* サブタスク */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">サブタスクを追加する</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  サブタスクを追加
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}