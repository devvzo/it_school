## IT School – TypeScript / Telegram-style web app

Фуллстек‑проект для онлайн IT‑школы для детей:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion (телеграм‑стиль, адаптивный дизайн, анимации)
- **Backend**: Node.js + Express + TypeScript + PostgreSQL + JWT + Nodemailer

### Структура

- `frontend` – SPA с главной страницей, тулбаром, списком курсов и модальными окнами входа / регистрации / сброса пароля.
- `backend` – REST API (`/api/auth`, `/api/courses`) + работа с PostgreSQL.

### Установка

1. Установите зависимости:

```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

2. Настройте базу данных PostgreSQL и выполните SQL‑скрипт:

```bash
psql "<ВАШ_DATABASE_URL>" -f backend/schema.sql
```

3. Создайте файл `backend/.env`:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/it_school
JWT_SECRET=some-strong-secret
# для реальной отправки писем:
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_login
SMTP_PASS=your_password
SMTP_FROM="IT School <no-reply@example.com>"
```

4. Запуск в режиме разработки:

```bash
# в корне проекта
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`


