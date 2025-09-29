.PHONY: help
help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: dev
dev: ## 開発環境を起動（PostgreSQLのみ）
	docker-compose -f docker-compose.dev.yml up -d
	@echo "PostgreSQL is running on localhost:5432"
	@echo "Run 'npm run dev' to start the application"

.PHONY: dev-down
dev-down: ## 開発環境を停止
	docker-compose -f docker-compose.dev.yml down

.PHONY: dev-logs
dev-logs: ## PostgreSQLのログを表示
	docker-compose -f docker-compose.dev.yml logs -f postgres

.PHONY: build
build: ## Dockerイメージをビルド
	docker-compose build

.PHONY: up
up: ## アプリケーション全体を起動（アプリ + PostgreSQL）
	docker-compose up -d

.PHONY: down
down: ## アプリケーション全体を停止
	docker-compose down

.PHONY: logs
logs: ## ログを表示
	docker-compose logs -f

.PHONY: migrate
migrate: ## データベースマイグレーションを実行
	npm run db:migrate

.PHONY: studio
studio: ## Prisma Studioを起動
	npm run db:studio

.PHONY: seed
seed: ## シードデータを投入
	npm run db:seed

.PHONY: reset-db
reset-db: ## データベースをリセット
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	npm run db:migrate
	npm run db:seed

.PHONY: psql
psql: ## PostgreSQLに接続
	docker exec -it donezo-postgres-dev psql -U postgres -d donezo

.PHONY: test
test: ## テストを実行
	npm test

.PHONY: test-e2e
test-e2e: ## E2Eテストを実行
	npm run test:e2e

.PHONY: lint
lint: ## リンターを実行
	npm run lint

.PHONY: typecheck
typecheck: ## 型チェックを実行
	npm run typecheck