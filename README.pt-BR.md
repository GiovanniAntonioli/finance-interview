# Build Greenfield Nativo de IA: Portal de Cobranças de Contas a Receber

## Contexto

Você está construindo um Portal de Cobranças de Contas a Receber (AR) do zero para a Filterbuy.

A Filterbuy recebe dados de faturas de um provedor externo. Alguns clientes estão em atraso. O departamento financeiro precisa de uma ferramenta interna leve para visualizar os AR em aberto, gerar links de pagamento seguros para clientes e automatizar lembretes de cobrança.

Este não é um pedido para construir uma plataforma financeira completa. Construa uma primeira fatia de produção confiável.

## Formato da Entrevista

Este exercício começa ao vivo com a equipe de entrevistadores. Use a sessão ao vivo para esclarecer requisitos, configurar seu loop de execução com IA, fazer progresso inicial na implementação e explicar suas decisões enquanto trabalha.

Após a chamada, você terá até 2 horas adicionais para finalizar, verificar e empacotar sua submissão.

## Configuração Operacional

Faça seu trabalho em um fork sob seu próprio perfil ou organização no GitHub. Este é o repositório que será avaliado.

1. Faça um fork deste repositório para sua conta do GitHub.
2. Clone o seu fork, não o repositório original da Filterbuy:

   ```bash
   git clone git@github.com:<seu-usuario-ou-org>/finance-interview.git
   cd finance-interview
   ```

3. Confirme que `origin` aponta para o seu fork:

   ```bash
   git remote -v
   ```

   Formato esperado:

   ```text
   origin  git@github.com:<seu-usuario-ou-org>/finance-interview.git (fetch)
   origin  git@github.com:<seu-usuario-ou-org>/finance-interview.git (push)
   ```

4. Construa sua solução nesse fork clonado.
5. Faça commit de todos os artefatos e envie-os para o seu fork.
6. Dê acesso à equipe de entrevistadores ao seu fork para avaliação. Se o seu fork for privado, adicione os revisores da Filterbuy solicitados como colaboradores ou conceda acesso ao time do GitHub solicitado.

Não envie sua implementação para o repositório original do exercício da Filterbuy.

Faça commit de tudo que a IA produzir para o projeto, não apenas o código final da aplicação. Isso inclui specs geradas por IA, planos de implementação, notas de revisão, arquivos de prompt/contexto, planos de teste e quaisquer outros artefatos que influenciaram sua solução. Se você rejeitar um artefato gerado por IA, mantenha o resumo ou trecho relevante em `AI_WORKLOG.md` e explique o motivo.

## Sua Tarefa

Construa um sistema funcional de cobranças de AR capaz de:

1. Carregar dados de faturas a partir dos fixtures JSON fornecidos.
2. Exibir um dashboard interno de AR agrupado por cliente.
3. Calcular dias de aging e faixas de aging.
4. Preservar status separados do provedor e do financeiro.
5. Permitir que usuários financeiros marquem faturas como pagas, incobráveis ou reabertas.
6. Registrar um histórico de auditoria para decisões financeiras.
7. Gerar links seguros para o portal do cliente.
8. Expor uma página pública do portal onde o cliente possa ver apenas suas próprias faturas elegíveis.
9. Gerar ações de lembrete e escalonamento com base nas datas de vencimento e dias de aging.
10. Incluir testes significativos.

## Entregáveis Obrigatórios

Sua submissão deve incluir:

- Uma aplicação funcionando.
- Um `docker-compose.yml` funcional que consiga executar a aplicação e quaisquer serviços necessários a partir de um checkout limpo.
- Testes.
- Um `README.md` do projeto explicando configuração, arquitetura, trade-offs e como executar a verificação.
- `AI_WORKLOG.md` documentando como você usou agentes de IA.
- Uma breve demonstração do que você construiu e o que faria a seguir.

Este repositório inicial contém intencionalmente apenas instruções e datasets. Você escolhe a stack.

## Fixtures

Use estes fixtures como dados iniciais:

- `datasets/invoices.json`
- `datasets/collection_events.json`

Você pode transformar os dados no schema do banco de dados escolhido durante a ingestão, mas preserve os campos fonte e as ambiguidades. Não limpe silenciosamente os casos extremos.

Use `2026-05-15` como a data "hoje" determinística padrão para testes e dados de demonstração, a menos que sua aplicação permita explicitamente fornecer outra data.

## Regras de Negócio Principais

### Aging

Calcule o aging a partir de `dueDate` até a data "hoje" fornecida.

Faixas de aging obrigatórias:

- `atual`: vence hoje ou no futuro
- `1-30`: 1 a 30 dias em atraso
- `31-60`: 31 a 60 dias em atraso
- `61-90`: 61 a 90 dias em atraso
- `90+`: mais de 90 dias em atraso

Faturas sem `dueDate` não devem travar o sistema. Tome uma decisão deliberada de produto sobre como elas aparecem no dashboard e no motor de lembretes, e documente-a.

### Separação de Status

`providerStatus` é o estado fonte do provedor externo. Trate-o como dado sincronizado somente leitura.

`financeStatus` é a decisão interna de negócio da Filterbuy. Pode diferir do status do provedor.

Apenas faturas com `financeStatus = "open"` contam como AR em aberto cobráveis e candidatas a lembrete.

### Decisões Financeiras

Suporte estas decisões:

- Marcar como pago
- Marcar como incobrável
- Reabrir

Cada transição deve:

- Exigir um motivo.
- Aceitar uma referência opcional, como número de cheque ou ticket de suporte.
- Criar uma entrada de auditoria com status anterior, próximo status, motivo, referência, ator e timestamp.

### Dashboard Interno de AR

Dashboard mínimo útil:

- Total de AR em aberto.
- Breakdown de aging.
- Tabela de clientes com:
  - cliente
  - e-mail
  - quantidade de faturas em aberto
  - valor total em aberto
  - maior número de dias de aging
  - status do link do portal
  - próxima ação recomendada

O agrupamento deve usar identidade estável do cliente, não apenas o nome de exibição. O fixture inclui variações de nome para o mesmo cliente.

### Links Seguros para o Portal

Usuários financeiros devem ser capazes de gerar um link do portal para o cliente.

Design esperado:

- Gerar um token aleatório.
- Armazenar apenas um hash do token.
- Expirar tokens.
- Escopar tokens a um ID de cliente específico.
- Permitir revogação ou status inativo.
- Rastrear contagem de acessos e hora do último acesso.

Nunca armazene tokens brutos em repouso. Nunca exponha faturas de outro cliente pelo portal.

### Portal Público do Cliente

A página pública do portal deve:

- Não ter o chrome do dashboard interno.
- Exibir o nome do cliente.
- Exibir o saldo total em aberto.
- Listar as faturas em aberto daquele cliente.
- Exibir número da fatura, data de vencimento, aging, valor devido e link de pagamento do provedor quando disponível.
- Excluir faturas pagas, incobráveis, anuladas, reembolsadas ou outras inelegíveis.
- Nunca exibir faturas de outro cliente.

### Motor de Lembretes e Escalonamento

Construa um script, worker, método de serviço ou ação de UI que aceite uma data "hoje" fornecida e retorne as ações a serem tomadas. Não envie e-mails reais.

Projete uma fronteira limpa, como:

- `EmailProvider`
- implementação fake ou em memória
- log de ações
- testes

Exemplos de ações:

```json
[
  {
    "type": "customer_reminder",
    "invoiceExternalId": "inv_001",
    "customerId": "cus_acme",
    "customerEmail": "ap@acme.example",
    "template": "past_due",
    "reason": "Fatura está 44 dias em atraso"
  },
  {
    "type": "internal_alert",
    "customerId": "cus_beta",
    "recipient": "ar-team@filterbuy.com",
    "reason": "Cliente tem fatura com 90+ dias em atraso e sem e-mail"
  }
]
```

Comportamento sugerido:

- Lembrete de vencimento próximo: fatura vence em 7 dias.
- Lembrete de atraso: fatura está 1 a 30 dias em atraso.
- Escalonamento: fatura está 31 ou mais dias em atraso.
- Escalonamento de alto risco: fatura está com mais de 90 dias em atraso.
- E-mail do cliente ausente deve bloquear lembretes ao cliente e gerar um alerta interno.
- Faturas pagas e incobráveis não devem gerar ações de lembrete.
- Data de vencimento ausente deve gerar uma ação de revisão interna, não um lembrete ao cliente.

Você pode ajustar a cadência se documentar as regras e testá-las.

## Requisito Nativo de IA

Não aborde isso como um exercício de codificação normal.

Esperamos que você crie um loop de execução com IA:

- Tenha um agente inspecionando os requisitos e produzindo um plano do sistema.
- Tenha outro gerando uma implementação inicial.
- Tenha outro gerando testes e casos extremos.
- Tenha outro revisando o diff para corretude e segurança.
- Use um agente de navegador ou preview para validar a UI.
- Documente onde você aceitou ou rejeitou o output da IA.

Você pode se mover rapidamente. Você não pode ser ingênuo.

Mantenha `AI_WORKLOG.md` com:

- ferramentas e agentes utilizados
- prompts ou instruções de tarefa
- outputs importantes
- sugestões aceitas
- sugestões rejeitadas
- etapas de verificação
- riscos remanescentes

Bom uso de IA parece operar uma equipe de execução, não pedir ao autocomplete que preencha arquivos.

## Testes Obrigatórios

Inclua testes para:

- Limites das faixas de aging.
- Status financeiro versus status do provedor.
- Agrupamento de clientes apesar de variações de nome.
- Transições de status financeiro.
- Criação de entradas de auditoria.
- Acesso com token de portal válido.
- Rejeição de token de portal expirado.
- Rejeição de token de portal revogado ou inativo.
- Isolamento de cliente no portal.
- Elegibilidade para lembrete.
- Comportamento com e-mail ausente.
- Comportamento com data de vencimento ausente.
- Faturas pagas excluídas do AR e dos lembretes.

## Invariantes Importantes

Preserve estes invariantes:

- Apenas faturas com `financeStatus = "open"` contam como AR cobrável.
- Status do provedor é dado fonte, não a decisão financeira.
- Decisões financeiras exigem histórico de auditoria.
- Decisões financeiras exigem um motivo.
- Tokens do portal são armazenados como hash.
- Tokens do portal são escopados a um único cliente.
- Tokens expirados ou revogados falham.
- O portal público não pode vazar faturas de outro cliente.
- E-mail do cliente ausente bloqueia lembretes ao cliente e pode acionar alerta interno.
- Aging e lembretes são determinísticos com base em uma data fornecida.
