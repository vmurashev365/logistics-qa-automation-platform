# 📊 Архитектура Logistics QA Automation Platform

## Обзор

Logistics QA Automation Platform построен на основе **многоуровневой архитектуры**,
где каждый уровень имеет четкую зону ответственности.
Это обеспечивает переиспользование кода, легкую поддержку и масштабируемость.

---

## 🏗️ Структура фреймворка (снизу вверх)

### **Уровень 1: Базовые Утилиты** (`src/utils/`)

Самый нижний уровень - базовые технические функции без бизнес-логики.

**Файлы:**

- `wait.ts` - функции ожидания условий, элементов, состояний
- `retry.ts` - повторные попытки выполнения операций при ошибках
- `tablet-helpers.ts` - вспомогательные функции для планшетов

**Назначение:** Предоставляют низкоуровневые технические возможности для всех вышестоящих слоев.

---

### **Уровень 2: Помощники** (`src/helpers/`)

Бизнес-специфичные вспомогательные функции.

**Файлы:**

- `money.ts` - работа с деньгами (конвертация, округление, сравнение)
- `FinancialCalculator.ts` - финансовые расчеты
- `OfflineSyncHelper.ts` - синхронизация оффлайн данных
- `CtiWebSocketMock.ts` - мок для CTI WebSocket интеграции
- `service-env.ts` - настройки окружения сервисов

**Назначение:** Инкапсулируют бизнес-логику, которая используется в нескольких местах.

---

### **Уровень 3: UI-MAP** (`src/ui-map/`)

Паттерн UI-MAP - отделяет селекторы от логики тестов.

**Файлы:**

- `buttons.ts` - селекторы всех кнопок
- `fields.ts` - селекторы полей ввода
- `pages.ts` - URL и селекторы страниц
- `messages.ts` - селекторы сообщений
- `tablet.ts` - специфичные селекторы для планшетов

Ключи полей и кнопок связывают шаги с подписями в Odoo. Например, `UI_MAP.fields.licensePlate` возвращает
`License Plate`, а `UI_MAP.buttons.create` — `New`. Реализация также использует локаторы в объектах страниц и шагах.
[UI-MAP](../src/ui-map/index.ts)

### **Уровень 4: Page Objects** (`src/pages/`)

Page Object Model - классы, представляющие страницы приложения.

**Структура:**

- `base/BasePage.ts` - базовый класс для всех страниц
- `base/OdooBasePage.ts` - базовый класс специфичный для Odoo
- `web/` - классы страниц веб-приложения

**Назначение:** Страницы используют UI-MAP для поиска элементов и предоставляют методы для взаимодействия.

Например, [VehiclesListPage](../src/pages/web/fleet/VehiclesListPage.ts) открывает список и форму создания,
а [VehicleFormPage](../src/pages/web/fleet/VehicleFormPage.ts) работает с полями и сохранением записи.

### **Уровень 5: API слой** (`src/api/`)

Для тестирования API без UI.

**Структура:**

- `clients/` - HTTP клиенты для взаимодействия с API
- `endpoints/` - определения эндпоинтов API
- `models/` - модели данных для запросов/ответов

**Назначение:** Прямое тестирование backend API, подготовка тестовых данных.

---

### **Уровень 6: Support** (`src/support/`)

Инфраструктурный слой Cucumber.

**Файлы:**

- `custom-world.ts` - кастомный World объект (контекст для всех шагов)
- `env.ts` - переменные окружения
- `hooks.ts` - хуки Before/After для сценариев

**Назначение:** Управление жизненным циклом тестов, общий контекст.

---

### **Уровень 7: BDD Steps** (3-слойная архитектура)

#### **7.1 Atomic Steps** (`src/steps/atomic/`)

Базовые технические действия, переиспользуемые повсюду.

**Файлы:**

- `navigation.steps.ts` - навигация по приложению
- `interaction.steps.ts` - клики, ввод текста, базовые взаимодействия
- `assertions.steps.ts` - проверки
- `api.steps.ts` - API запросы
- `db.steps.ts` - работа с БД

**Пример:**

```gherkin
When I click "create" button
Then I should see "License Plate" text
```

#### **7.2 Domain Steps** (`src/steps/domain/`)

Бизнес-логика конкретных модулей.

**Файлы:**

- `auth.steps.ts` - аутентификация
- `fleet.steps.ts` - управление автопарком
- `cti.steps.ts` - CTI интеграция
- `offline-sync.steps.ts` - оффлайн синхронизация
- `security.steps.ts` - проверки безопасности
- `tablet.steps.ts` - специфичная логика планшетов

**Пример:**

```gherkin
Given I am logged in as admin
Given vehicle "MD-DRV-011" exists in the system
```

#### **7.3 Composite Steps** (`src/steps/composite/`)

Сложные бизнес-процессы.

**Файлы:**

- `vehicle-workflows.steps.ts` - полные workflow по работе с транспортом

**Пример:**

```gherkin
When I assign driver "Maria Rusu" to vehicle "MD-DRV-011"
```

Для этого шага требуется открытая сессия и существующая машина.

---

### **Уровень 8: Feature Files** (`features/`)

Самый верхний уровень - описание сценариев на языке Gherkin.

**Структура:**

```text
features/
├── smoke.feature              # Быстрые smoke тесты
├── security.feature           # Тесты безопасности
├── visual-regression.feature  # Визуальные тесты
├── web/                       # Веб-тесты
│   ├── fleet/                 # Модуль автопарка
│   └── cti_screen_pop.feature # CTI функционал
├── mobile/                    # Тесты для планшетов
├── api/                       # API тесты
└── integration/               # Интеграционные тесты
```

**Пример:**

```gherkin
@smoke
Feature: Fleet Management Smoke Test
  As a Fleet Manager
  I want to manage vehicles
  So that I can track the company fleet

  Background:
    Given Odoo is accessible
    And I am logged in as admin

  @critical @smoke-001
  Scenario: Access Vehicles page
    When I navigate to "vehicles" page
    Then the vehicles list should be shown
```

---

## 🔄 Поток выполнения теста

```text
Feature File (Gherkin)
    ↓
Cucumber Parser
    ↓
Step Definitions (atomic/domain/composite)
    ↓
Page Objects
    ↓
UI-MAP (селекторы)
    ↓
Playwright (браузер)
    ↓
Allure Report
```

**Детально:**

1. **Feature file** описывает сценарий на Gherkin
2. **Cucumber** парсит сценарий и ищет соответствующие **Step Definitions**
3. **Steps** вызывают **Page Objects** для взаимодействия с UI
4. **Page Objects** используют **UI-MAP** для поиска элементов
5. **Helpers** и **Utils** предоставляют вспомогательную логику
6. **Hooks** управляют жизненным циклом (открытие/закрытие браузера, скриншоты)
7. Результаты сохраняются в **allure-results/**
8. **Allure** генерирует отчеты

---

## Изоляция сценариев

Cucumber создаёт контекст браузера и World для каждого сценария. `test:all` использует два воркера.
Планировщик запускает сценарий с тегом `@serial` отдельно от других сценариев того же прогона.
Хуки удаляют зарегистрированные тестовые записи и выполняют отложенную очистку.
[Хуки](../src/support/hooks.ts) · [Планировщик](../src/support/parallel.ts)

## 📋 Конфигурационные файлы

**Корень проекта:**

- `package.json` - npm скрипты, зависимости
- `cucumber.js` - конфигурация Cucumber
- `playwright.config.ts` - конфигурация отдельного Playwright Test runner и размеры экранов планшетов
- `tsconfig.json` - настройки TypeScript
- `docker-compose.yml` - локальное окружение Odoo

---

## 🔧 Технологический стек

- **Playwright** - автоматизация браузера
- **Cucumber** - BDD фреймворк
- **TypeScript** - типизированный JavaScript
- **Allure** - отчеты о тестировании
- **Docker** - контейнеризация Odoo
- **PostgreSQL** - база данных (для API/DB тестов)

---

## 📚 Дополнительная документация

- [Руководство для нетехнических специалистов](../README.md)
- [Примеры тестов](../features/)
- [API документация](./API_TESTING.md)
