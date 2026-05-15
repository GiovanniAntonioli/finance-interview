# Roadmap

## Stack Escolhido

| Camada | Tecnologia | Razão |
|---|---|---|
| Framework | Next.js 15 (App Router) | Roteamento /dashboard interno e /portal/[token] público em um codebase; SSR e API Routes |
| Linguagem | TypeScript | Type safety para regras de negócio críticas (aging, tokens, audit) |
| ORM | Prisma | Schema-first, migrations, seed; type-safe queries |
| Banco | PostgreSQL 16 | Relacional, FK constraints, JSONB para metadados de eventos |
| Estilo | Tailwind CSS | UI rápida sem biblioteca pesada de componentes |
| Testes | Jest + ts-jest | Unit e integration; sem framework extra de e2e para o prazo |
| Infra | Docker Compose | app + postgres, checkout limpo → up |

## Milestones

### M1 — Foundation (Fase 1)
Projeto Next.js inicializado, schema Prisma definido, seed dos fixtures funcionando, Docker Compose verde.

### M2 — Aging Engine (Fase 2)
Função pura de aging calculando dias e faixas. Testada de forma determinística com `today=2026-05-15`.

### M3 — AR Dashboard + Finance Actions (Fase 3-4)
Dashboard interno listando clientes com breakdown de aging. Ações de status (pago/incobrável/reabrir) com auditoria.

### M4 — Secure Portal (Fase 5-6)
Geração e validação de tokens hasheados. Portal público mostrando apenas faturas do cliente autorizado.

### M5 — Reminder Engine (Fase 7)
Motor determinístico gerando ações de lembrete e escalonamento. Sem envio real, com EmailProvider fake.

### M6 — Tests + Docs (Fase 8)
Todos os 13 cenários de teste obrigatórios. README.md de arquitetura. AI_WORKLOG.md.
