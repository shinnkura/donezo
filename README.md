# Donezo - ポモドーロタイマー & タスク管理PWA

フルスタック・プロダクション品質のポモドーロタイマーとタスク管理アプリケーション。オフライン対応、リアルタイム同期、詳細なレポート機能を備えたPWA。

## 🚀 主要機能

### ⏱️ ポモドーロタイマー
- **高精度タイマー**: Web Worker実装による正確な時間管理
- **3つのモード**: Focus (25分)、Short Break (5分)、Long Break (15分)
- **連続モード**: 自動的に次のセッションへ移行
- **通知機能**: デスクトップ通知とサウンド
- **バックグラウンド動作**: タブが非アクティブでも正確に動作

### ✅ タスク管理
- **プロジェクト管理**: タスクをプロジェクト別に整理
- **優先度設定**: 高・中・低の3段階
- **見積りポモドーロ数**: タスクごとの所要時間を見積り
- **サブタスク**: タスクを細かく分割
- **繰り返しタスク**: RRULE形式での定期タスク設定
- **ドラッグ&ドロップ**: タスクの並び替えが簡単

### 📊 レポート機能
- **日/週/月の集計**: 期間別の集中時間を可視化
- **プロジェクト配分**: 円グラフでプロジェクト別時間配分を表示
- **達成率分析**: 見積りvs実績の比較
- **統計サマリー**: 主要指標を一目で確認

### 🔄 同期とオフライン
- **IndexedDB**: ローカルデータの永続化
- **オフライン対応**: ネットワークなしでも完全動作
- **自動同期**: オンライン復帰時に自動的にデータ同期
- **競合解決**: タイムスタンプベースの自動マージ

### 📱 PWA機能
- **インストール可能**: デスクトップ/モバイルアプリとして動作
- **Service Worker**: オフラインキャッシュとバックグラウンド同期
- **プッシュ通知**: リマインダーとアラート
- **ホーム画面ショートカット**: クイックアクセス

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui
- **状態管理**: Zustand
- **データベース**: PostgreSQL + Prisma
- **認証**: NextAuth.js
- **オフライン**: IndexedDB (Dexie)
- **チャート**: Recharts
- **テスト**: Vitest, Playwright

## 📦 セットアップ

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- npm または yarn

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/yourusername/donezo.git
cd donezo
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/donezo"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

4. **データベースのセットアップ**
```bash
# データベースマイグレーション
npm run db:migrate

# シードデータの投入（オプション）
npm run db:seed
```

5. **開発サーバーの起動**
```bash
npm run dev
```

アプリケーションが http://localhost:3000 で起動します。

## 🚀 本番環境へのデプロイ

### ビルド
```bash
npm run build
```

### 起動
```bash
npm start
```

### Docker
```bash
docker build -t donezo .
docker run -p 3000:3000 --env-file .env.production donezo
```

### Vercel
```bash
vercel deploy
```

## 📝 スクリプト

```bash
# 開発
npm run dev         # 開発サーバー起動

# データベース
npm run db:migrate  # マイグレーション実行
npm run db:seed     # シードデータ投入
npm run db:studio   # Prisma Studio起動

# ビルド
npm run build       # プロダクションビルド
npm start           # プロダクションサーバー起動

# テスト
npm test            # ユニットテスト実行
npm run test:e2e    # E2Eテスト実行
npm run test:coverage # カバレッジ測定

# 品質チェック
npm run lint        # ESLint実行
npm run typecheck   # TypeScriptチェック
```

## 🧪 テスト

### ユニットテスト
```bash
npm test
```

### E2Eテスト
```bash
npx playwright install  # 初回のみ
npm run test:e2e
```

### テストカバレッジ
```bash
npm run test:coverage
```

## 📱 PWAインストール

### デスクトップ (Chrome/Edge)
1. アドレスバーの右側にあるインストールアイコンをクリック
2. 「インストール」をクリック

### モバイル (iOS)
1. Safari でアプリを開く
2. 共有ボタンをタップ
3. 「ホーム画面に追加」を選択

### モバイル (Android)
1. Chrome でアプリを開く
2. メニューから「ホーム画面に追加」を選択

## 🔒 セキュリティ

- パスワードは bcrypt でハッシュ化
- JWT による認証トークン管理
- CSRF 保護
- XSS 対策
- SQL インジェクション防止（Prisma）

## 🎯 今後の機能追加予定

- [ ] チーム機能とコラボレーション
- [ ] AI による タスク推定
- [ ] カレンダー統合（Google Calendar, Outlook）
- [ ] Slack/Discord 通知
- [ ] データエクスポート（CSV, PDF）
- [ ] モバイルアプリ（React Native）
- [ ] デスクトップアプリ（Tauri）

## 📄 ライセンス

MIT License

## 👥 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容について議論してください。

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 バグ報告

[GitHub Issues](https://github.com/yourusername/donezo/issues) でバグを報告してください。

## 📧 お問い合わせ

- Email: support@donezo.app
- Twitter: [@donezo_app](https://twitter.com/donezo_app)
- Discord: [Donezo Community](https://discord.gg/donezo)

---

Built with ❤️ by Your Team