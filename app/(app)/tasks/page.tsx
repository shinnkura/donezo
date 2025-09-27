"use client";

import { useState, useEffect } from "react";
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
  Search,
  Filter,
  Calendar,
  Flag,
  CheckSquare,
  Trash2,
  Edit,
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // 新規タスクフォームの状態
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    projectId: "none",
    estimatePomos: 1,
    dueAt: "",
  });

  // タスクとプロジェクトを取得
  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/actions/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getTasks" }),
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      setTasks(data.tasks || []);
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

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/actions/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getProjects" }),
      });

      if (!response.ok) throw new Error("Failed to fetch projects");

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
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
          projectId: newTask.projectId === "none" ? null : newTask.projectId,
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
          projectId: "none",
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

  // フィルタリング
  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterPriority !== "all" && task.priority !== filterPriority) {
      return false;
    }
    if (filterProject !== "all" && task.projectId !== filterProject) {
      return false;
    }
    return true;
  });

  const incompleteTasks = filteredTasks.filter((t) => !t.isDone);
  const completedTasks = filteredTasks.filter((t) => t.isDone);

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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">タスク管理</h1>
        <p className="text-muted-foreground">効率的にタスクを管理しましょう</p>
      </div>

      {/* ツールバー */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="タスクを検索..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[120px]">
                <Flag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="優先度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="プロジェクト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規タスク
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>新しいタスクを作成</DialogTitle>
                <DialogDescription>
                  タスクの詳細を入力してください。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="タスクのタイトルを入力"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note">メモ</Label>
                  <Textarea
                    id="note"
                    value={newTask.note}
                    onChange={(e) =>
                      setNewTask({ ...newTask, note: e.target.value })
                    }
                    placeholder="タスクの詳細を入力"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">優先度</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: "LOW" | "MEDIUM" | "HIGH") =>
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH">高</SelectItem>
                        <SelectItem value="MEDIUM">中</SelectItem>
                        <SelectItem value="LOW">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estimatePomos">見積りポモドーロ数</Label>
                    <Input
                      id="estimatePomos"
                      type="number"
                      min="1"
                      value={newTask.estimatePomos}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          estimatePomos: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project">プロジェクト</Label>
                    <Select
                      value={newTask.projectId}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, projectId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">なし</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueAt">期限</Label>
                    <Input
                      id="dueAt"
                      type="date"
                      value={newTask.dueAt}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueAt: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={createTask}>作成</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* タスクリスト */}
      <Tabs defaultValue="incomplete" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incomplete">
            未完了 ({incompleteTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            完了済み ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incomplete" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    読み込み中...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : incompleteTasks.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    タスクがありません
                  </h3>
                  <p className="text-muted-foreground">
                    新しいタスクを作成して始めましょう。
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            incompleteTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox
                    checked={task.isDone}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{task.title}</h3>
                        {task.note && (
                          <p className="text-sm text-muted-foreground">
                            {task.note}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                          {task.project && (
                            <Badge variant="outline">{task.project.name}</Badge>
                          )}
                          {task.estimatePomos > 0 && (
                            <Badge variant="secondary">
                              🍅 {task.completedPomos}/{task.estimatePomos}
                            </Badge>
                          )}
                          {task.dueAt && (
                            <Badge variant="outline">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(task.dueAt).toLocaleDateString("ja-JP")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    完了したタスクはありません
                  </h3>
                </div>
              </CardContent>
            </Card>
          ) : (
            completedTasks.map((task) => (
              <Card key={task.id} className="opacity-75">
                <CardContent className="flex items-start gap-4 p-4">
                  <Checkbox
                    checked={task.isDone}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold line-through">
                          {task.title}
                        </h3>
                        {task.note && (
                          <p className="text-sm text-muted-foreground line-through">
                            {task.note}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                          {task.project && (
                            <Badge variant="outline">{task.project.name}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
