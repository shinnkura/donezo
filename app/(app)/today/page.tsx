"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Plus,
  Clock,
  Flag,
  Calendar,
  Bell,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

const projectColors: { [key: string]: string } = {
  work: "#3B82F6",
  study: "#10B981",
  develop: "#8B5CF6",
};

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // タスクを取得
  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const fetchTodayTasks = async () => {
    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getTasks" }),
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      // 今日のタスクのみフィルタリング（デモデータ）
      const todayTasks = data.tasks?.filter((task: Task) => {
        // 実際の実装では、dueAtが今日の日付のタスクをフィルタリング
        return true; // デモのため全てのタスクを表示
      }) || [];
      setTasks(todayTasks.slice(0, 5)); // デモのため5件まで表示
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
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createTask",
          title: newTaskTitle,
          priority: "MEDIUM",
          estimatePomos: 1,
          dueAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      const data = await response.json();
      if (data.task) {
        setTasks([data.task, ...tasks]);
        setNewTaskTitle("");
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

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">今日</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{incompleteTasks.length}</p>
              <p className="text-xs text-muted-foreground">タスク</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {tasks.reduce((acc, task) => acc + task.estimatePomos, 0)}
              </p>
              <p className="text-xs text-muted-foreground">ポモドーロ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* タスク入力フィールド */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="今日のタスクを追加..."
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
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">今日のタスクはありません</h3>
              <p className="text-muted-foreground">新しいタスクを追加して始めましょう。</p>
            </div>
          ) : (
            <>
              {incompleteTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group bg-background border"
                >
                  <Checkbox
                    checked={task.isDone}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{task.title}</span>
                      {task.projectId && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: projectColors[task.projectId] || "#6B7280" }}
                        />
                      )}
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
                  <div className="text-xs text-muted-foreground mt-4 mb-2">完了済み</div>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 group opacity-60 bg-background border"
                    >
                      <Checkbox
                        checked={task.isDone}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium line-through">{task.title}</span>
                          {task.projectId && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: projectColors[task.projectId] || "#6B7280" }}
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
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}