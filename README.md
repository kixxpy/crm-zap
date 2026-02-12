# CRM магазина запчастей

Next.js 14 проект с TypeScript и App Router.

## Технологии

- **Next.js 14** с App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** — библиотека компонентов (Radix UI + CVA)

## Структура проекта

```
parts-crm/
├── app/                  # App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/               # UI-компоненты (shadcn)
├── lib/
│   └── utils.ts          # Утилиты (cn)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Запуск

```bash
npm install
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Добавление компонентов shadcn

```bash
npx shadcn@latest add button
npx shadcn@latest add input
# и т.д.
```
# crm-zap
