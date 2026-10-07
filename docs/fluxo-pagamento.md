# Pagamento do cliente

O escritório escolhe as formas aceitas e define entrada, máximo de parcelas e eventual desconto à vista para Pix/boleto na proposta. Ao aprovar, o cliente escolhe a forma; para Pix/boleto, escolhe também a quantidade dentro dessas condições. No cartão, escolhe o parcelamento depois, no Asaas. A forma entra no texto do contrato antes do aceite. Após a assinatura, o servidor prepara o pagamento na conta Asaas do escritório, e o cliente abre o pagamento pelo contrato ou pelo projeto/portal.

- Pix e boleto: uma cobrança para cada valor e vencimento aprovado.
- Cartão: o contrato registra o valor total, sem entrada separada nem quantidade escolhida no NorteArq. O cliente escolhe à vista ou parcelado no checkout hospedado pelo Asaas, de acordo com as opções disponíveis para o cartão. A configuração permite até 21 parcelas, respeitando o mínimo de R$ 5,00 por parcela; o limite do escritório não se aplica ao cartão. Os dados completos do pagador e do cartão são preenchidos no Asaas.
- À vista no Pix/boleto: uma cobrança, com o desconto previamente oferecido pelo escritório. O checkout de cartão recebe o total integral, e não o desconto condicionado a pagamento único no NorteArq.
- Sem Asaas ativo: somente Pix combinado diretamente com o escritório; o projeto mantém QR Code e copia e cola quando a chave estiver cadastrada.

Os dados de cartão são informados na fatura do Asaas. Assinatura e confirmação do pagamento são etapas separadas. O webhook existente continua responsável pela baixa e pelo recibo; a recuperação de links também concilia cobranças já confirmadas. Aditivos mantêm seu fluxo independente.

Propostas antigas já aprovadas, ainda sem escolher a forma, pedem essa escolha no contrato. Antes de assinar, escolher cartão registra o valor total e deixa o parcelamento para o Asaas. Contratos já assinados preservam valores e parcelas anteriores. Cobranças ou pagamentos já existentes impedem trocar a forma. O indicador `cartao_no_asaas` diferencia o checkout dos fluxos anteriores. O botão **Ver pagamento como cliente**, no contrato e no projeto do escritório, abre o link público válido já emitido; não gera nem reenvia links.

Essa regra é global e usa a conta e o webhook próprios de cada escritório conectado. Uma compra aprovada no cartão gera recibo e quita a obrigação do cliente no contrato; isso não significa dinheiro disponível na conta do escritório. Os prazos e tarifas de recebimento seguem o Asaas. A notificação e o painel do escritório explicam essa diferença. A assinatura do próprio NorteArq permanece em seu fluxo separado.

## Recuperação de falhas

O preparo usa uma trava por contrato e consulta a referência externa antes de criar cobranças. Uma solicitação persistente registra a tentativa antes do POST ao Asaas. Em timeout ou resposta ambígua, outra tentativa primeiro consulta o Asaas; a ausência de confirmação impede um novo POST. Caso essa situação persista, o suporte deve conferir a conta Asaas e a referência externa antes de liberar a solicitação. Não apagar solicitações ou gerar outra cobrança sem essa conferência.

Em Pix/boleto e contratos anteriores, links e identificadores de cada parcela são salvos individualmente, com um link comum para o saldo parcelado no cartão nos contratos antigos. Falha ao salvar é recuperada consultando o mesmo pagamento. O botão **Ir para pagamento** permite concluir parcelas restantes; abrir a página apenas consulta o estado.

No checkout, cada tentativa é persistida antes do POST. `CHECKOUT_CREATED` recupera o link se a resposta se perder, e `CHECKOUT_PAID` confirma a compra em uma transação idempotente, após validar escritório e total. O callback do navegador nunca confirma pagamento. `CHECKOUT_EXPIRED` e `CHECKOUT_CANCELED` encerram o link; só depois disso uma nova sessão é permitida. Solicitações ambíguas continuam bloqueadas até confirmação pelo webhook ou conferência do suporte. Um link é válido por até 24 horas.

Novas conexões incluem os eventos de checkout. Conexões anteriores preservam URL, senha, eventos de cobrança e estado; os eventos necessários de checkout são acrescentados antes da primeira criação. Webhook desativado/interrompido impede abrir checkout novo. Não trocar chaves nem reativar filas automaticamente.

## Implantação e validação

Aplicar `0043_fluxo_pagamento.sql`, `0044_cartao_valor_total.sql` e `0045_cartao_checkout_global.sql`, e publicar o código correspondente. Essas migrações são independentes de `0042_pedido_repetido.sql`.

```powershell
node scripts/test-fluxo-pagamento.mjs
node scripts/test-formatacao.mjs
node scripts/verificar-migracao-pagamento.mjs
npm.cmd run build
```

O primeiro teste simula Asaas e banco sem carregar `.env.local` nem acessar a rede. Verifica cartão, Pix, boleto, centavos, assinatura, concorrência, timeout e recuperação de links, inclusive após confirmação parcial. O teste SQL cria registros fictícios numa transação com rollback, sem chamar o Asaas. Verifica aprovação, limites, assinatura, contrato antigo, valores, permissões, link vencido e trava.

Backups locais em `.backups`: código anterior, definições e permissões das funções do banco e SQL de retorno. Para voltar, restaurar o código anterior junto das funções antigas. Preservar as colunas/tabelas de pagamento e os identificadores Asaas já criados; cobranças externas exigem conferência antes de qualquer cancelamento. Os testes não efetuam pagamento nem geram cobrança real. A confirmação de uma transação real depende do cliente e da conta Asaas.

Referências: [checkout para cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [eventos de checkout](https://docs.asaas.com/docs/eventos-para-checkout) e [parcelamento Asaas](https://docs.asaas.com/docs/criar-uma-cobranca-parcelada).
