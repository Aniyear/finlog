# FinLog 2.0

**PWA для учёта задолженностей декларантов**

## Стек

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Next.js 14 + TypeScript + PWA     |
| Backend   | Python + FastAPI + SQLAlchemy     |
| Database  | PostgreSQL (Supabase)             |
| PDF       | PyMuPDF (fitz) — без OCR/AI       |

## Структура проекта

```
FinLog2.0/
├── backend/
│   ├── app/
│   │   ├── domain/           # Entities
│   │   ├── application/      # Services, parser
│   │   ├── infrastructure/   # DB, repositories
│   │   └── presentation/     # API routes
│   ├── migrations/
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Pages
│   │   ├── components/       # UI components
│   │   ├── lib/              # API client
│   │   └── types/            # TypeScript types
│   ├── public/               # PWA assets
│   └── package.json
└── README.md
```

## Установка и запуск

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### 2. Backend

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать (Windows)
venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Настроить .env (уже настроен, проверьте пароль)
# DATABASE_URL=postgresql://postgres:your_password@db.xxx.supabase.co:5432/postgres

# Запустить
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend будет доступен: http://localhost:8000  
Swagger UI: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev
```

Frontend будет доступен: http://localhost:3000

### 4. База данных

Таблицы создаются автоматически при запуске backend.  
Для ручного создания используйте SQL из `backend/migrations/init.sql`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/brokers` | Список декларантов с долгами |
| POST | `/brokers` | Создать декларанта |
| DELETE | `/brokers/{id}` | Удалить декларанта |
| GET | `/brokers/{id}/transactions` | Операции декларанта |
| GET | `/brokers/{id}/debt` | Текущий долг |
| POST | `/transactions` | Создать операцию |
| DELETE | `/transactions/{id}` | Удалить операцию |
| POST | `/receipts/upload` | Загрузить PDF чек |
| GET | `/health` | Health check |

## Логика расчёта долга

```
current_debt = SUM(accrual) - SUM(payment + transfer + cash)
```

- Положительный баланс = долг
- Отрицательный баланс = переплата
- Долг **не хранится** в БД, вычисляется при каждом запросе

## Обработка чеков

1. Загрузка PDF
2. Извлечение текста (PyMuPDF)
3. Определение типа (payment/transfer) по ключевым словам
4. Парсинг полей через regex
5. Preview + ручное редактирование
6. Сохранение как операция

**Без OCR, без AI.**

## PWA

- `manifest.json` — metadata для установки
- `sw.js` — service worker (network-first + offline fallback)
- `offline.html` — страница при отсутствии интернета
