# gremu — запчасти Hyundai и Kia

Интернет-магазин запчастей для Hyundai и Kia в Узбекистане. Сайт на двух языках (RU/UZ). В нём есть:
- подбор детали по автомобилю и OEM-номеру;
- корзина и заказ;
- личный кабинет с входом через Google;
- оплата Payme;
- AI-помощник на Gemini;
- обращения менеджеру;
- админ-панель.

gremu — независимый магазин, а не официальный дилер Hyundai или Kia.

> Чек-лист запуска, все production-ключи и ручные шаги владельца — в [docs/LAUNCH.md](docs/LAUNCH.md).
> Платежи подробно — в [docs/PAYMENTS.md](docs/PAYMENTS.md).

## Стек

- **Next.js 15** (App Router) + React 19 + TypeScript (strict), Tailwind CSS 4, GSAP и Lenis для анимаций.
- **PostgreSQL + Drizzle ORM.**
  - Без `DATABASE_URL` используется встроенная PGlite (`.data/pglite`): это только для локальной разработки.
  - Миграции из `./drizzle` применяются автоматически при первом запросе.
- **Zod** проверяет все входные данные на сервере.
- **Тесты:** Vitest (unit + integration на PostgreSQL в памяти) и Playwright (E2E smoke).

## Быстрый старт

```bash
npm install
cp .env.example .env.local      # заполните то, что нужно (см. ниже)
npm run dev                     # http://localhost:3000
```

Без ключей сайт тоже работает. Интеграции, для которых нет настроек, честно показывают «не подключено», ничего не имитируется:
- **Почта:** письма менеджеру пишутся в лог, а обращения сохраняются в БД.
- **Google:** кнопка «Войти через Google» неактивна.
- **Payme:** способ оплаты не предлагается.
- **AI-помощник:** сразу предлагает форму для менеджера.

В режиме разработки в пустую базу засеваются **16 демо-товаров**, и они помечены как demo. В production каталог стартует пустым.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер |
| `npm run build` / `npm start` | production-сборка и запуск |
| `npm run typecheck` | TypeScript без сборки |
| `npm run lint` | ESLint |
| `npm test` | unit + integration тесты (Vitest, БД в памяти, внешних сервисов не нужно) |
| `npm run test:e2e` | E2E smoke против запущенного сайта (`E2E_BASE_URL`, по умолчанию `http://localhost:3000`; использует установленный Google Chrome) |
| `npm run check` | typecheck + lint + тесты |
| `npm run db:generate` | создать миграцию после изменения `src/lib/db/schema.ts` |
| `npm run admin:hash -- "пароль"` | хеш пароля владельца для `ADMIN_PASSWORD_HASH` |

E2E-тесты создают в базе того сайта, против которого запущены, настоящие тестовые заказы и обращения. Не запускайте их против production.

## Переменные окружения

Все секреты читаются только на сервере, а в клиентский код не попадает ни одна переменная. Полный список с комментариями — в [.env.example](.env.example).

| Переменная | Зачем | Без неё |
|---|---|---|
| `APP_URL` | базовый адрес: ссылки, sitemap, OAuth redirect, возврат из Payme | `http://localhost:3000` |
| `APP_SECRET` | подпись сессий, OAuth-флоу и ссылок на заказ гостя | **обязательна в production** |
| `DATABASE_URL` | PostgreSQL (Supabase, Neon, свой сервер) | встроенная PGlite, только dev |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | вход покупателей и сотрудников через Google | вход недоступен |
| `ADMIN_EMAILS`, `STAFF_EMAILS` | кто из Google-аккаунтов получает доступ к админке | только пароль владельца |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | резервный вход владельца по паролю | — |
| `MANAGER_EMAIL`, `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM` | письма менеджеру о заказах и обращениях | письма пишутся в лог |
| `PAYME_MODE`, `PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY` | онлайн-оплата Payme | Payme не предлагается |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI-помощник | только форма менеджеру |
| `AUTH_DEV_LOGIN=1` | тестовый вход без Google, **только локально** | — (в production игнорируется) |
| `CATALOG_SEED_DEMO=1` | засеять демо-каталог в production (не нужно) | — |

## Интеграции

### Google OAuth (вход)

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (тип Web application).
2. **Authorized redirect URIs**: `${APP_URL}/api/auth/google/callback` для каждого окружения, например `http://localhost:3000/api/auth/google/callback` и `https://<домен>/api/auth/google/callback`.
3. **Authorized JavaScript origins**: `${APP_URL}`.
4. **OAuth consent screen**: пока приложение в режиме Testing, добавьте свои аккаунты в Test users. Перед запуском опубликуйте приложение.
5. Впишите `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`.

Что запрашивается и как устроена сессия:
- Scopes: только `openid email profile`.
- Сессии хранятся в таблице `user_sessions`, в cookie лежит только случайный токен.
- Роли назначает сервер по `ADMIN_EMAILS` / `STAFF_EMAILS`.

### Почта (Resend)

Задайте `MANAGER_EMAIL`, `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY` и `EMAIL_FROM`. Адрес отправителя должен быть на домене, подтверждённом в Resend.

Обращение сохраняется в БД ещё до отправки письма. Если письмо не ушло, его видно в «Админка → Обращения», и там его можно отправить повторно.

### Payme

Нужны endpoint `${APP_URL}/api/payments/payme` и поле счёта `order_id`. Тестовый режим, фискализация и переход в production описаны в [docs/PAYMENTS.md](docs/PAYMENTS.md).

Click пока только интерфейс, он не активен.

### Gemini

1. Получите ключ на https://aistudio.google.com/apikey и ограничьте его Generative Language API.
2. Задайте `GEMINI_API_KEY`. Модели по умолчанию: `gemini-3.6-flash`, при перегрузке или снятии модели — `gemini-3.5-flash-lite`, затем `gemini-3.8-flash` (свой список — через `GEMINI_MODEL=a,b`).

Ограничения помощника:
- Он только читает каталог и FAQ, менять цены, заказы и платежи он не может.
- Помечать деталь как подходящую он может только при подтверждённой совместимости.
- Сообщения ограничены по длине и частоте.

## Админ-панель — `/ru/admin`

- **staff:** заказы, обращения, товары (цены, остатки, публикация, совместимость), экспорт CSV.
- **admin:** всё то же плюс категории, бренды, удаление товаров, импорт CSV и журнал действий.
- **Совместимость:** покупатель видит «Подходит» только для строк со статусом «Подтверждена».
- **Импорт CSV:** формат описан на странице импорта. Импорт проходит по принципу «всё или ничего» и поддерживает режим «только проверить». Тот же импорт доступен через API `POST /api/admin/products/import` (multipart, роль admin).

## База данных и миграции

- Схема описана в `src/lib/db/schema.ts`. После её изменения запустите `npm run db:generate` и закоммитьте новую папку в `drizzle/`.
- Миграции применяются автоматически при старте. В dev-режиме новые миграции подхватываются без перезапуска.
- Деньги хранятся только целыми тийинами (`bigint`), числа с плавающей точкой для денег не используются.
- **Supabase:** используйте строку **Transaction pooler** (порт 6543) как `DATABASE_URL`. На всех таблицах включён Row Level Security (миграция `0007_enable_rls`): REST API Supabase с публичным ключом не видит данные, а сайт работает как владелец таблиц. **Каждой новой таблице добавляйте в миграцию `ENABLE ROW LEVEL SECURITY`**, иначе она станет доступна через публичный API.
- Каталог из CSV можно загрузить и из консоли: `npm run catalog:import -- файл.csv [--dry-run] [--hide-demo]`.
- Резервные копии production-базы настраиваются у провайдера PostgreSQL.

## Деплой

Подойдёт любой Node.js-хостинг с PostgreSQL: Vercel + Supabase или Neon, Railway, Render, свой VPS.

1. Создайте базу PostgreSQL и задайте `DATABASE_URL`.
2. Задайте переменные из таблицы выше. Обязательно `APP_URL` (https) и длинный случайный `APP_SECRET`.
3. `npm run build` и `npm start`. На Vercel это делается автоматически.
4. Добавьте production redirect URI в Google, а endpoint — в кабинет Payme.
5. Пройдите чек-лист из [docs/LAUNCH.md](docs/LAUNCH.md).

Ограничения при масштабировании:
- **Rate limit** хранится в памяти процесса. На нескольких инстансах или serverless лимиты не общие, поэтому для production с горизонтальным масштабированием нужен Redis/Upstash.
- **Поиск** по каталогу фильтрует опубликованные товары в памяти. Для нескольких тысяч товаров этого достаточно, при росте фильтры нужно перенести в SQL.

## Безопасность (что уже сделано)

- Секреты используются только на сервере. Это проверено сканированием клиентского bundle.
- Права проверяются на сервере в каждой странице, server action и API admin/account, а не только скрытием кнопок.
- **CSRF:**
  - JSON-API требуют `application/json` и тот же Origin;
  - form-эндпоинты проверяют Origin;
  - server actions защищены самим Next.js;
  - cookie выставлены `HttpOnly`, `SameSite=Lax` и `Secure` в production.
- **XSS:** пользовательский текст экранируется React, `dangerouslySetInnerHTML` используется только для статичного скрипта анимаций.
- **SQL:** все запросы идут через параметризованный Drizzle, а `LIKE`-шаблоны экранируются.
- **Заголовки:** `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS в production. Приватные страницы отдаются с `no-store`.
- **Платежи:** заказ считается оплаченным только после проверенного callback Payme (ключ, сумма, идемпотентность). Номера карт и CVV сайт не получает и не хранит.
- **Загрузки:** CSV не больше 2 МБ, проверяется построчно. Других загрузок пока нет.

## Структура

```
src/app/[locale]/        страницы (RU/UZ): витрина, кабинет, админка
src/app/api/             route handlers: checkout, auth, payments, assistant, admin
src/features/            бизнес-логика: catalog, cart, orders, account, payments, inquiries, assistant
src/lib/                 db, auth, email, rate limit, http helpers
src/i18n/                словари RU/UZ
drizzle/                 SQL-миграции
tests/                   unit, integration (Vitest), e2e (Playwright)
docs/                    PRD, SPEC, TASKS, PAYMENTS, LAUNCH
```
