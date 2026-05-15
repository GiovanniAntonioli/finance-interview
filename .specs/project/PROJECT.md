# AR Collections Portal — Project Vision

## Problem Statement

Filterbuy recebe dados de faturas de um provedor externo mas não tem ferramenta interna para
gerenciar cobranças. O time financeiro opera no escuro: não sabe quais clientes estão em atraso,
não tem como gerar links de pagamento, e faz lembretes manualmente. Isso resulta em AR não
cobrado e sem auditoria de decisões.

## Goals

- [ ] Dashboard interno que mostra AR em aberto agrupado por cliente com aging
- [ ] Motor de decisão financeira (pago/incobrável/reabrir) com trilha de auditoria completa
- [ ] Portal público do cliente com acesso seguro via token hasheado e escopado
- [ ] Motor de lembretes determinístico que gera ações sem enviar e-mails reais
- [ ] Sistema dockerizado, testado e documentado — pronto para demo

## Out of Scope

| Feature | Reason |
|---|---|
| Autenticação de usuário interno | Exercício não pede auth; dashboard é interno sem login |
| Sincronização em tempo real com provedor | Dados vêm de fixtures estáticos |
| Envio real de e-mails/SMS | Motor de lembretes gera ações, não despacha |
| Interface de administração multi-tenant | Single-tenant, time financeiro único |
| Histórico de versões de faturas | Spec não requer versionamento de invoice |

## Success Criteria

- [ ] `docker-compose up` sobe app + banco + seed do zero sem erro
- [ ] Dashboard exibe 180 faturas dos fixtures com aging correto para 2026-05-15
- [ ] Decisão financeira grava entrada de auditoria e muda financeStatus
- [ ] Token de portal válido mostra apenas faturas do cliente correto
- [ ] Token expirado ou revogado retorna 401/403
- [ ] Motor de lembretes retorna ações corretas para data fornecida
- [ ] Suite de testes cobre todos os 13 cenários obrigatórios da spec
