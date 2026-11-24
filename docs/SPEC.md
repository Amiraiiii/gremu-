# SPEC.md --- Gremu Parts

## 1. Назначение документа

Техническая спецификация для реализации Gremu Parts. Если существующий
репозиторий уже использует другой стек, Claude Code должен сначала
оценить его и предложить минимально рискованный путь, а не переписывать
проект автоматически.

## 2. Рекомендуемый стек

-   Next.js App Router + React + TypeScript.
-   Tailwind CSS для styling; собственные design tokens.
-   GSAP + ScrollTrigger для scroll animation.
-   PostgreSQL (например, Supabase Postgres) + Drizzle ORM или Prisma.
    Выбрать один ORM.
-   Supabase Auth либо Auth.js для Google OAuth --- выбрать один путь,
    не смешивать две системы сессий.
-   Supabase Storage или S3-compatible storage для товарных изображений.
-   Zod для валидации входных данных.
-   Gemini API через server-side SDK/REST adapter.
-   Payme adapter для платежей; Click adapter позже.
-   Email provider: Resend или SMTP через серверный adapter.
-   Vitest для unit/integration; Playwright для E2E.

**Важно:** это рекомендуемая конфигурация, а не требование мигрировать
уже работающий проект. Не подключать одновременно несколько
альтернативных ORM/auth providers.

## 3. Архитектурные принципы

-   Server-first: каталог, цены, наличие, заказы, платежи и секреты
    обрабатываются на сервере.
-   Client components использовать только для интерактивных элементов.
-   Все внешние сервисы скрыты за interfaces/adapters.
-   Валидация выполняется на границе API и повторно на бизнес-слое.
-   Все денежные значения хранить integer в тийинах или согласованной
    минимальной единице валюты; форматировать в UZS на UI. Не
    использовать float для денег.
-   Время хранить в UTC; показывать локально для Asia/Tashkent.
-   Суммы заказа пересчитывать на сервере из актуальных цен.
-   Использовать транзакции БД для создания заказа и его позиций.
-   Секреты не передавать клиенту.

## 4. Предлагаемая структура директорий

``` text
src/
  app/
    [locale]/
      (store)/
        page.tsx
        catalog/
        categories/[slug]/
        products/[slug]/
        search/
        cart/
        checkout/
        contact/
        faq/
      (account)/
        account/
          profile/
          vehicles/
          orders/
          payments/
          favorites/
      (admin)/
        admin/
          products/
          categories/
          orders/
          inquiries/
      api/
        auth/
        checkout/
        payments/
          payme/
            create/
            callback/
        ai/
          chat/
        inquiries/
        webhooks/
  components/
    layout/
    navigation/
    home/
    catalog/
    product/
    vehicle-selector/
    cart/
    checkout/
    account/
    ai-assistant/
    admin/
    ui/
  features/
    catalog/
    fitment/
    cart/
    orders/
    payments/
    auth/
    ai/
    inquiries/
  lib/
    db/
    auth/
    email/
    payments/
    gemini/
    validation/
    rate-limit/
    i18n/
    seo/
  styles/
  types/
drizzle/ or prisma/
public/
  images/
```

Адаптировать структуру к выбранной версии Next.js и существующему
репозиторию.

## 5. Data model

Ниже логическая модель. Реальные SQL-типы и связи уточнить под выбранную
БД/ORM.

### User

-   id (UUID, PK)
-   auth_provider_id (unique)
-   email (unique, nullable только если auth provider позволяет)
-   full_name
-   phone
-   preferred_locale (`ru` \| `uz`)
-   role (`customer` \| `staff` \| `admin`)
-   created_at, updated_at

### Address

-   id
-   user_id (FK)
-   label
-   recipient_name
-   phone
-   region
-   city
-   address_line
-   postal_code (nullable)
-   is_default
-   created_at, updated_at

### Vehicle

-   id
-   user_id (FK, nullable для гостевого selector state не для постоянной
    записи)
-   make (`Hyundai` \| `Kia`)
-   model
-   generation (nullable)
-   year
-   engine (nullable)
-   trim (nullable)
-   market (nullable)
-   created_at

### Category

-   id
-   parent_id (nullable FK)
-   name_ru
-   name_uz
-   slug (unique)
-   description_ru/uz (nullable)
-   sort_order
-   is_active

### Product

-   id
-   category_id (FK)
-   title_ru
-   title_uz
-   slug (unique)
-   description_ru/uz
-   sku (unique)
-   oem_number (indexed, nullable)
-   manufacturer
-   vehicle_make
-   part_type (`original` \| `aftermarket` \| `used`)
-   price_minor (integer)
-   currency (`UZS`)
-   stock_quantity (integer, nullable if stock unknown)
-   availability (`in_stock` \| `low_stock` \| `out_of_stock` \|
    `on_request`)
-   is_published
-   created_at, updated_at

### ProductImage

-   id
-   product_id (FK)
-   storage_key
-   alt_ru, alt_uz
-   sort_order

### Fitment

-   id
-   product_id (FK)
-   make
-   model
-   generation (nullable)
-   year_from, year_to
-   engine (nullable)
-   trim (nullable)
-   fitment_status (`verified` \| `unverified` \| `not_compatible`)
-   source_note (nullable)
-   verified_by (nullable user/admin ID)
-   verified_at (nullable)

### Favorite

-   user_id (FK)
-   product_id (FK)
-   created_at
-   unique(user_id, product_id)

### Cart / CartItem

-   Cart: id, user_id nullable, session_key nullable, created_at,
    updated_at
-   CartItem: id, cart_id, product_id, quantity, created_at, updated_at
-   Enforce that a cart belongs to a user or a guest session, not both
    without explicit merge logic.

### Order

-   id
-   order_number (unique, human-readable)
-   user_id (nullable for guest)
-   customer_name
-   customer_email (nullable)
-   customer_phone
-   region, city, address_line (nullable for pickup)
-   delivery_method
-   customer_note
-   subtotal_minor
-   delivery_fee_minor
-   total_minor
-   currency (`UZS`)
-   status (`new` \| `confirmed` \| `processing` \| `ready` \| `shipped`
    \| `completed` \| `cancelled`)
-   payment_status (`unpaid` \| `pending` \| `paid` \| `failed` \|
    `refunded`)
-   created_at, updated_at

### OrderItem

-   id
-   order_id (FK)
-   product_id nullable FK
-   product_title_snapshot
-   sku_snapshot
-   oem_snapshot
-   unit_price_minor
-   quantity
-   line_total_minor

Снимки названия и цены нужны, чтобы история заказа не менялась после
редактирования каталога.

### Payment

-   id
-   order_id (FK)
-   provider (`payme` \| `click` \| `cash_on_delivery`)
-   provider_payment_id (nullable, indexed)
-   amount_minor
-   currency
-   status (`created` \| `pending` \| `paid` \| `failed` \| `cancelled`
    \| `refunded`)
-   provider_payload_redacted (JSON, nullable; без секретов и карточных
    данных)
-   paid_at (nullable)
-   created_at, updated_at

### Inquiry

-   id
-   user_id nullable
-   name
-   phone nullable
-   email nullable
-   topic
-   message
-   source (`contact_form` \| `fitment_request` \| `ai_handoff`)
-   status (`new` \| `in_progress` \| `closed`)
-   ai_summary nullable
-   created_at, updated_at

### AuditLog

-   id
-   actor_user_id
-   action
-   entity_type
-   entity_id
-   metadata_redacted JSON
-   created_at

## 6. API contracts

Все endpoint names примерные; адаптировать к Next.js route
handlers/server actions. Все входы валидировать Zod.

### Catalog

-   `GET /api/catalog/products?q=&make=&model=&year=&category=&minPrice=&maxPrice=&sort=&page=`
-   `GET /api/catalog/products/:slug`
-   `GET /api/catalog/fitment/options?make=&model=`
-   `GET /api/catalog/oem/:number`

Ответы должны содержать только опубликованные товары. Фильтры должны
работать на сервере, не загружать весь каталог в браузер.

### Cart and checkout

-   `POST /api/checkout/quote` --- серверно проверяет товары, цены,
    остатки и рассчитывает quote.
-   `POST /api/checkout/orders` --- создаёт заказ и позиции в
    транзакции.
-   `GET /api/account/orders` --- только заказы текущего пользователя.
-   `GET /api/account/orders/:orderNumber` --- проверка владельца или
    безопасный одноразовый guest access token.

Не доверять переданным с клиента ценам, скидкам, ролям или payment
status.

### Inquiries

-   `POST /api/inquiries` --- validate → rate limit → persist → send
    email.
-   `POST /api/inquiries/ai-handoff` --- сохраняет summary диалога и
    контактные данные после явного согласия.

### AI

-   `POST /api/ai/chat`
    -   input: conversationId optional, message, locale, selectedVehicle
        optional.
    -   output: answer, suggestedProducts\[\], needsHumanHelp,
        handoffPrompt.
    -   Ограничить длину запроса и число сообщений.
    -   Сервер сам добавляет контекст каталога. Не принимать
        произвольные system prompts от клиента.

## 7. Payment integration

### Interface

``` ts
type PaymentCreateInput = {
  orderId: string;
  amountMinor: number;
  currency: "UZS";
  description: string;
  returnUrl: string;
};

type PaymentCreateResult = {
  providerPaymentId?: string;
  checkoutUrl: string;
};

interface PaymentProvider {
  createPayment(input: PaymentCreateInput): Promise<PaymentCreateResult>;
  verifyCallback(request: Request): Promise<VerifiedPaymentEvent>;
}
```

### Payme flow

1.  Сервер создаёт заказ со статусом `pending/unpaid`.
2.  Сервер формирует запрос Payme по актуальной официальной
    документации.
3.  Пользователь перенаправляется на hosted checkout.
4.  Payme возвращает пользователя на сайт, но redirect сам по себе не
    подтверждает оплату.
5.  Backend принимает callback, проверяет подпись и параметры по
    официальной документации.
6.  Backend проверяет order ID, сумму, валюту и допустимый переход
    статуса.
7.  Обновление Payment и Order выполняется атомарно и идемпотентно.
8.  Повторный callback не должен повторно менять заказ или отправлять
    дублирующие письма.

**Нельзя:** хранить merchant secret в клиенте; логировать секрет/полный
чувствительный payload; считать оплату успешной по URL параметру;
доверять сумме из браузера.

### Click

Создать отдельный adapter только после изучения актуальной документации
Click и получения merchant credentials. До этого UI должен обозначать
Click как «скоро» или скрывать его.

### Saved payment methods

Не хранить PAN, CVV или банковские пароли. Если провайдер поддерживает
токенизацию и сохранённые способы оплаты, хранить только provider
token/reference и masked label, соблюдая правила провайдера. Иначе в
профиле показывать только историю платежей.

## 8. Google OAuth

-   Использовать один auth provider.
-   Настроить Google OAuth client ID/secret в панели выбранного auth
    provider.
-   Redirect URLs и allowed origins строго задать для
    local/staging/production.
-   Проверять сессию на сервере.
-   Роль пользователя назначается сервером; нельзя позволять клиенту
    самостоятельно менять `role`.
-   Admin account создаётся через безопасную seed/ручную процедуру, а не
    через открытый публичный endpoint.
-   Не запрашивать лишние Google scopes.

## 9. Gemini assistant

### Backend boundary

-   `GEMINI_API_KEY` хранить только в server environment.
-   UI общается только с собственным `/api/ai/chat`.
-   Вызовы Gemini выполнять через server-side service.
-   Каталог предоставлять модели через контролируемые функции, например:
    -   `searchProducts(query, vehicleContext)`
    -   `getProductDetails(productId)`
    -   `getVerifiedFitment(productId, vehicleId)`
    -   `createInquiryDraft(summary)` --- создаёт черновик обращения, но
        отправка только после подтверждения пользователя.

### System behavior

-   Представляться AI-помощником Gremu Parts.
-   Сначала уточнять марку, модель, год, двигатель и OEM, когда это
    необходимо.
-   Предлагать только товары, найденные backend search.
-   Не заявлять, что товар подходит, если нет verified fitment.
-   Не выдумывать цену, остаток, происхождение, оригинальность, гарантию
    и доставку.
-   Не выдавать себя за человека или менеджера.
-   Для технически значимой неопределённости предложить связь с
    менеджером.
-   Перед передачей показать пользователю summary и запросить согласие
    на отправку.

## 10. Email manager

Переменные: - `EMAIL_PROVIDER` - `EMAIL_API_KEY` или SMTP credentials -
`MANAGER_EMAIL` - `EMAIL_FROM`

Email отправляется только из backend. Использовать шаблоны: - New
order - New inquiry - AI handoff - Payment status notification (только
после server-side verified event)

Если отправка email временно недоступна, обращение всё равно должно
сохраниться в БД и попасть в retry/failed queue или быть доступным в
админке. Не терять пользовательские заявки из-за сбоя почты.

## 11. Environment variables

Пример `.env.example`:

``` dotenv
APP_URL=http://localhost:3000
DATABASE_URL=

AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GEMINI_API_KEY=
GEMINI_MODEL=

PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=
PAYME_BASE_URL=
PAYME_CALLBACK_URL=

CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=

EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
MANAGER_EMAIL=

STORAGE_URL=
STORAGE_PUBLIC_BUCKET=
STORAGE_SERVICE_ROLE_KEY=

RATE_LIMIT_REDIS_URL=
```

Добавлять только реально используемые переменные. Никогда не коммитить
`.env.local` или production secrets.

## 12. UI routes

-   `/[locale]` --- главная.
-   `/[locale]/catalog` --- каталог.
-   `/[locale]/categories/[slug]` --- категория.
-   `/[locale]/products/[slug]` --- товар.
-   `/[locale]/search` --- поиск.
-   `/[locale]/cart` --- корзина.
-   `/[locale]/checkout` --- оформление.
-   `/[locale]/contact` --- контакты.
-   `/[locale]/faq` --- FAQ.
-   `/[locale]/account` --- обзор кабинета.
-   `/[locale]/account/profile`
-   `/[locale]/account/vehicles`
-   `/[locale]/account/orders`
-   `/[locale]/account/payments`
-   `/[locale]/account/favorites`
-   `/[locale]/admin` --- защищённая админка.

## 13. UI component specification

### Header

-   Wordmark GREMU PARTS.
-   Навигация: Каталог, Hyundai, Kia, Как подобрать, Контакты.
-   Search entry.
-   Language switch.
-   Account and cart icons.
-   Mobile navigation drawer.
-   Sticky behavior: компактный header после начала scroll, без резких
    скачков layout.

### Hero

-   Большой визуал с автомобилем/деталью.
-   Заголовок: «Точность начинается с правильной детали» (рабочий
    вариант, можно улучшить).
-   Подзаголовок без неподтверждённых обещаний.
-   CTA: «Подобрать запчасть».
-   Короткая форма выбора автомобиля или переход к selector.

### Vehicle selector

-   Шаги: марка → модель → год → двигатель.
-   Показать выбранную конфигурацию.
-   Возможность сбросить/изменить.
-   Для неизвестных конфигураций --- запрос менеджеру.

### Product card

-   Consistent image ratio.
-   Название, SKU/OEM, цена, availability.
-   Fitment label только при verified status.
-   Favorite action.
-   Add-to-cart button с loading/success/error state.

### AI widget

-   Компактная плавающая кнопка.
-   Открытие в panel/drawer.
-   Welcome message и quick prompts.
-   Сообщение о том, что AI может ошибаться.
-   Human handoff action.
-   Mobile: полноэкранный или почти полноэкранный drawer.

## 14. Motion specification

GSAP: - Использовать `gsap.context()` и cleanup в React effects. -
`ScrollTrigger` создавать и убивать корректно при unmount. - Не
анимировать layout properties без необходимости; предпочитать
transform/opacity. - Не использовать scroll hijacking. - Не создавать
бесконечные тяжёлые timelines. - На мобильных устройствах уменьшить
parallax и stagger. - При `prefers-reduced-motion: reduce` отключать
необязательные scroll effects. - Проверять refresh, route transitions и
динамическую загрузку изображений. - Не запускать анимации до готовности
нужного DOM.

Рекомендуемые эффекты: 1. Hero image reveal: clip-path или
scale/opacity, один раз. 2. Heading reveal: аккуратный stagger строк. 3.
Product image reveal: лёгкий opacity/translate. 4. Sticky editorial
section для объяснения процесса подбора. 5. Section transition через
тонкие линии/маски. 6. Button hover: короткий цветовой/иконный feedback.

## 15. Security checklist

-   Server-side auth checks на каждом account/admin endpoint.
-   RBAC на backend.
-   Zod validation.
-   Rate limiting на login-sensitive, AI, search и inquiry endpoints.
-   CSRF protection там, где используется cookie-based mutation и это
    требуется выбранной архитектурой.
-   Secure, HttpOnly, SameSite cookies через auth provider.
-   Output escaping и безопасный rich text.
-   Проверка MIME, размера и расширения файлов.
-   Ограничение upload types; не выполнять загруженные файлы.
-   Проверка webhook signature и idempotency.
-   Не логировать access tokens, API keys, passwords, CVV или полные
    платёжные payloads.
-   Не раскрывать чужие заказы и персональные данные.
-   Резервное копирование БД и план восстановления.

## 16. Testing

### Unit

-   money calculations;
-   price and stock validation;
-   fitment status rules;
-   order state transitions;
-   payment callback verification;
-   locale formatting.

### Integration

-   create order transaction;
-   user ownership checks;
-   payment callback idempotency;
-   inquiry persistence when email provider fails;
-   Gemini tool results constrained to real catalog products.

### E2E

-   catalog search → product → cart → checkout;
-   guest checkout;
-   Google sign-in;
-   account order history;
-   inquiry submission;
-   admin product update;
-   payment test flow with provider sandbox.

## 17. External references

-   Hyundai Uzbekistan: https://hyundai.uz/
-   Kia Uzbekistan: https://kia.uz/ru
-   Kia spare parts: https://kia.uz/ru/spare-parts
-   Kia official service: https://kia.uz/ru/owners/official-service
-   Payme API docs: https://docs.payme.uz/ru/
-   Public social reference found during discovery: Telegram `@hkd_uz`;
    channel description mentions Instagram `@gremuparts`. Confirm
    ownership and current contact details with the business before
    publishing.
-   Never scrape, copy or republish social content without permission.

## 18. Definition of Done

-   `npm run build` (or repository equivalent) passes.
-   Lint and typecheck pass.
-   Critical unit/integration tests pass.
-   No secrets committed or exposed to browser.
-   All public pages have loading/error/empty states.
-   Main purchase flow works end-to-end in test environment.
-   Payment status is based on verified provider response.
-   Email failure does not lose inquiries.
-   Google OAuth and admin authorization are verified.
-   RU and UZ interfaces are usable.
-   Mobile and reduced-motion checks pass.
-   README explains setup and every manual credential step.
