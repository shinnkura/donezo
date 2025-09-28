"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Clock,
  Flag,
  Calendar,
  Bell,
  Trash2,
  FolderOpen,
  CalendarDays,
  Target,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { dummyTasks, projects, Task, Project } from "@/lib/dummy-data";

type FilterType = "today" | "tomorrow" | "week" | "planned" | "completed" | "project";

export default function UnifiedTasksPage() {
  const searchParams = useSearchParams();
  const filterType = searchParams.get("filter") as FilterType || "today";
  const projectId = searchParams.get("project");

  const [tasks, setTasks] = useState<Task[]>(dummyTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { toast } = useToast();

  // 現在のビューの情報を取得
  const getCurrentView = () => {
    if (filterType === "project" && projectId) {
      const project = projects.find(p => p.id === projectId);
      return {
        title: project?.name || "プロジェクト",
        icon: FolderOpen,
        color: project?.color || "#6B7280",
        description: getProjectDescription(projectId),
      };
    }

    switch (filterType) {
      case "today":
        return {
          title: "今日",
          icon: CalendarDays,
          color: "#3B82F6",
          description: new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }),
        };
      case "tomorrow":
        return {
          title: "明日",
          icon: Calendar,
          color: "#10B981",
          description: getTomorrowDate(),
        };
      case "week":
        return {
          title: "今週",
          icon: Calendar,
          color: "#8B5CF6",
          description: "今週予定のタスク",
        };
      case "planned":
        return {
          title: "計画",
          icon: Target,
          color: "#F59E0B",
          description: "将来予定のすべてのタスク",
        };
      case "completed":
        return {
          title: "完了済み",
          icon: CheckCircle2,
          color: "#10B981",
          description: "完了したタスク",
        };
      default:
        return {
          title: "タスク",
          icon: CheckSquare,
          color: "#6B7280",
          description: "すべてのタスク",
        };
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  const getProjectDescription = (projectId: string) => {
    const descriptions: { [key: string]: string } = {
      work: "仕事関連のタスク",
      study: "学習関連のタスク",
      develop: "開発プロジェクト",
    };
    return descriptions[projectId] || "";
  };

  // タスクのフィルタリング
  useEffect(() => {
    let filtered = [...tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (filterType === "project" && projectId) {
      filtered = filtered.filter(task => task.projectId === projectId);
    } else {
      switch (filterType) {
        case "today":
          filtered = filtered.filter(task => {
            if (!task.dueAt) return false;
            const dueDate = new Date(task.dueAt);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime() && !task.isDone;
          });
          break;
        case "tomorrow":
          filtered = filtered.filter(task => {
            if (!task.dueAt) return false;
            const dueDate = new Date(task.dueAt);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === tomorrow.getTime() && !task.isDone;
          });
          break;
        case "week":
          filtered = filtered.filter(task => {
            if (!task.dueAt) return false;
            const dueDate = new Date(task.dueAt);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate >= today && dueDate <= nextWeek && !task.isDone;
          });
          break;
        case "planned":
          filtered = filtered.filter(task => !task.isDone);
          break;
        case "completed":
          filtered = filtered.filter(task => task.isDone);
          break;
      }
    }

    // ソート: 優先度高→中→低、その後日付順
    filtered.sort((a, b) => {
      // 完了状態で分ける
      if (a.isDone !== b.isDone) {
        return a.isDone ? 1 : -1;
      }

      // 優先度でソート
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // 期限でソート
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;

      return 0;
    });

    setFilteredTasks(filtered);
  }, [tasks, filterType, projectId]);

  const createTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      priority: "MEDIUM",
      estimatePomos: 1,
      completedPomos: 0,
      isDone: false,
      projectId: filterType === "project" ? projectId : null,
      dueAt: filterType === "today" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    toast({
      title: "成功",
      description: "タスクを作成しました",
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, isDone: !task.isDone } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
    toast({
      title: "成功",
      description: "タスクを削除しました",
    });
  };

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

  const currentView = getCurrentView();
  const incompleteTasks = filteredTasks.filter(t => !t.isDone);
  const completedTasks = filteredTasks.filter(t => t.isDone);
  const totalPomos = filteredTasks.reduce((acc, task) => acc + task.estimatePomos, 0);
  const completedPomos = filteredTasks.reduce((acc, task) => acc + task.completedPomos, 0);

  // プロジェクトビューの場合の統計情報
  const getProjectStats = () => {
    if (filterType === "project" && projectId) {
      const project = projects.find(p => p.id === projectId);
      const completionRate = project?.taskCount
        ? (project.completedCount! / project.taskCount) * 100
        : 0;
      return { project, completionRate };
    }
    return { project: null, completionRate: 0 };
  };

  const { project, completionRate } = getProjectStats();

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: currentView.color + "20" }}
            >
              <currentView.icon className="h-5 w-5" style={{ color: currentView.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{currentView.title}</h1>
              <p className="text-sm text-muted-foreground">{currentView.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {filterType === "project" ? (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{incompleteTasks.length}</p>
                  <p className="text-xs text-muted-foreground">予定時間</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{incompleteTasks.length}</p>
                  <p className="text-xs text-muted-foreground">未完了</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{completedPomos}</p>
                  <p className="text-xs text-muted-foreground">実行済み</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                  <p className="text-xs text-muted-foreground">完了済み</p>
                </div>
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
                      <Users className="mr-2 h-4 w-4" />
                      メンバーを管理
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
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold">{incompleteTasks.length}</p>
                  <p className="text-xs text-muted-foreground">タスク</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalPomos}</p>
                  <p className="text-xs text-muted-foreground">ポモドーロ</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          {/* プロジェクトビューの統計カード */}
          {filterType === "project" && (
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
                    <div className="text-2xl font-bold">{completedPomos}</div>
                    <span className="text-sm text-muted-foreground ml-1">時間</span>
                    <div className="text-2xl font-bold ml-2">{totalPomos - completedPomos}</div>
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
          )}

          {/* タスク入力フィールド */}
          {filterType !== "completed" && (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      filterType === "project"
                        ? `"${currentView.title}"に追加したいタスク名を入力してください`
                        : "タスクを追加..."
                    }
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim()) {
                        createTask();
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
          )}

          {/* タスクリスト */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <currentView.icon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">タスクがありません</h3>
                <p className="text-muted-foreground">
                  {filterType === "completed" ? "完了したタスクはまだありません" : "新しいタスクを追加して始めましょう"}
                </p>
              </div>
            ) : (
              <>
                {incompleteTasks.map((task) => {
                  const taskProject = projects.find(p => p.id === task.projectId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group border"
                    >
                      <Checkbox
                        checked={task.isDone}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{task.title}</span>
                          {taskProject && filterType !== "project" && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: taskProject.color }}
                            />
                          )}
                          <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                            {task.estimatePomos}P
                          </Badge>
                          {task.dueAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.dueAt).toLocaleDateString("ja-JP")}
                            </span>
                          )}
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
                  );
                })}
                {completedTasks.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground mt-4 mb-2">完了済み</div>
                    {completedTasks.map((task) => {
                      const taskProject = projects.find(p => p.id === task.projectId);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group opacity-60 border"
                        >
                          <Checkbox
                            checked={task.isDone}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="h-5 w-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium line-through">{task.title}</span>
                              {taskProject && filterType !== "project" && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: taskProject.color }}
                                />
                              )}
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
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 右サイドバー (プロジェクトビューのみ) */}
        {filterType === "project" && (
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
                    <Button className="w-full" style={{ backgroundColor: currentView.color }}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4 border-b", className)}>{children}</div>;
}

function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("font-semibold", className)}>{children}</h3>;
}