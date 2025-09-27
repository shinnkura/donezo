"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Coffee,
  Brain,
  SkipForward,
} from "lucide-react";
import { useTimerStore } from "@/lib/stores/timer-store-simple";

const TIMER_TYPES = {
  work: {
    label: "ポモドーロ",
    color: "bg-red-500",
    icon: Brain,
  },
  "short-break": {
    label: "ショートブレイク",
    color: "bg-green-500",
    icon: Coffee,
  },
  "long-break": {
    label: "ロングブレイク",
    color: "bg-blue-500",
    icon: Coffee,
  },
};

export default function TimerPage() {
  const {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    mode,
    status,
    timeRemaining,
    completedPomos,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipTimer,
    setMode,
  } = useTimerStore();

  const [settings, setSettings] = useState({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
  });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Load settings
  useEffect(() => {
    setSettings({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
    });
  }, [workDuration, shortBreakDuration, longBreakDuration]);

  const handleUpdateSettings = (field: string, value: number) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);

    // Update store with new settings
    useTimerStore.setState({
      workDuration: newSettings.workDuration,
      shortBreakDuration: newSettings.shortBreakDuration,
      longBreakDuration: newSettings.longBreakDuration,
    });

    // Reset timer with new duration if currently in that mode
    if (
      (field === "workDuration" && mode === "work") ||
      (field === "shortBreakDuration" && mode === "short-break") ||
      (field === "longBreakDuration" && mode === "long-break")
    ) {
      useTimerStore.setState({
        timeRemaining: value * 60,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTotalDuration = () => {
    switch (mode) {
      case "work":
        return workDuration * 60;
      case "short-break":
        return shortBreakDuration * 60;
      case "long-break":
        return longBreakDuration * 60;
      default:
        return workDuration * 60;
    }
  };

  const progress =
    getTotalDuration() > 0
      ? ((getTotalDuration() - timeRemaining) / getTotalDuration()) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ポモドーロタイマー
          </h1>
          <p className="text-muted-foreground">
            25分集中、5分休憩のポモドーロテクニックで生産性を向上
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          本日: {completedPomos} ポモドーロ
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                {Object.entries(TIMER_TYPES).map(([key, timerType]) => (
                  <Button
                    key={key}
                    variant={mode === key ? "default" : "outline"}
                    onClick={() => setMode(key as any)}
                    disabled={status === "running"}
                  >
                    <timerType.icon className="mr-2 h-4 w-4" />
                    {timerType.label}
                  </Button>
                ))}
              </div>
              <CardTitle className="text-lg">
                {TIMER_TYPES[mode].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-8xl font-mono font-bold mb-4">
                  {formatTime(timeRemaining)}
                </div>
                <Progress value={progress} className="h-3 mb-6" />
                <div className="flex items-center justify-center space-x-4">
                  {status === "idle" && (
                    <Button onClick={startTimer} size="lg" className="px-8">
                      <Play className="mr-2 h-5 w-5" />
                      開始
                    </Button>
                  )}
                  {status === "running" && (
                    <Button onClick={pauseTimer} size="lg" className="px-8">
                      <Pause className="mr-2 h-5 w-5" />
                      一時停止
                    </Button>
                  )}
                  {status === "paused" && (
                    <Button onClick={resumeTimer} size="lg" className="px-8">
                      <Play className="mr-2 h-5 w-5" />
                      再開
                    </Button>
                  )}
                  <Button onClick={resetTimer} variant="outline" size="lg">
                    <RotateCcw className="mr-2 h-5 w-5" />
                    リセット
                  </Button>
                  {status !== "idle" && (
                    <Button onClick={skipTimer} variant="secondary" size="lg">
                      <SkipForward className="mr-2 h-5 w-5" />
                      スキップ
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>今日の統計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-red-600">
                  {completedPomos}
                </p>
                <p className="text-sm text-muted-foreground">完了ポモドーロ</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">
                  総集中時間: {Math.floor((completedPomos * workDuration) / 60)}
                  時間
                  {(completedPomos * workDuration) % 60}分
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="durations">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="durations">時間設定</TabsTrigger>
                </TabsList>
                <TabsContent value="durations" className="space-y-4">
                  <div>
                    <Label htmlFor="work-duration">ポモドーロ時間（分）</Label>
                    <Input
                      id="work-duration"
                      type="number"
                      value={settings.workDuration}
                      onChange={(e) =>
                        handleUpdateSettings(
                          "workDuration",
                          parseInt(e.target.value) || 25
                        )
                      }
                      className="mt-1"
                      min="1"
                      max="60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="short-break-duration">
                      ショートブレイク（分）
                    </Label>
                    <Input
                      id="short-break-duration"
                      type="number"
                      value={settings.shortBreakDuration}
                      onChange={(e) =>
                        handleUpdateSettings(
                          "shortBreakDuration",
                          parseInt(e.target.value) || 5
                        )
                      }
                      className="mt-1"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="long-break-duration">
                      ロングブレイク（分）
                    </Label>
                    <Input
                      id="long-break-duration"
                      type="number"
                      value={settings.longBreakDuration}
                      onChange={(e) =>
                        handleUpdateSettings(
                          "longBreakDuration",
                          parseInt(e.target.value) || 15
                        )
                      }
                      className="mt-1"
                      min="1"
                      max="60"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>現在のステータス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">モード</span>
                  <Badge
                    variant={mode === "work" ? "destructive" : "secondary"}
                  >
                    {TIMER_TYPES[mode].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    ステータス
                  </span>
                  <Badge variant={status === "running" ? "default" : "outline"}>
                    {status === "idle" && "待機中"}
                    {status === "running" && "実行中"}
                    {status === "paused" && "一時停止"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">進捗</span>
                  <span className="text-sm font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
