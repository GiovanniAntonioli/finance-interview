# Project State

**Última atualização**: 2026-05-15

## Decisões

### Stack: Next.js 15 + TypeScript + Prisma + PostgreSQL + Tailwind
**Por que**: Roteamento dual (dashboard interno / portal público) em um codebase. App Router
provê separação limpa. Prisma + PostgreSQL para constraints relacionais e audit trail confiável.
**Trade-off aceito**: Sem auth de usuário interno (exercício não exige).

### Identidade do cliente: customerId como chave estável
**Por que**: Fixture contém variações de nome ("Acme HVAC", "ACME HVAC LLC") para o mesmo
`customerId = "cus_acme"`. Nome exibido = nome da fatura mais recente.

### null dueDate → band "no-due-date"
**Por que**: Decisão de produto deliberada — não assumir que fatura sem vencimento está em atraso.
Motor gera `internal_review`, não `customer_reminder`.

### Token de portal: revogar anterior ao criar novo
**Por que**: Simplicidade e segurança — cliente sempre tem no máximo 1 token ativo. Link anterior
para de funcionar, evitando tokens abandonados válidos.

### today determinístico: parâmetro explícito
**Por que**: Spec exige `today=2026-05-15` como padrão para testes. Todas as funções de aging e
reminder aceitam `today: Date` como parâmetro, nunca chamam `new Date()` internamente.

## Blockers

Nenhum blocker ativo.

## Preferências

- Respostas concisas, sem trailing summaries
- Commits atômicos por task

## TODOs

- [ ] Confirmar se autenticação básica (Basic Auth ou middleware simples) é desejada para o dashboard interno após execução inicial
- [ ] Decidir se paginação do dashboard é P2 ou P3 com 180 registros
