# Pagamento do cliente

O escritório escolhe as formas aceitas e define entrada, máximo de parcelas e eventual desconto à vista na proposta. O cliente escolhe a forma e a quantidade dentro dessas condições ao aprovar. A escolha entra no texto do contrato antes do aceite. Após a assinatura, o servidor prepara as cobranças na conta Asaas do escritório, e o cliente abre o pagamento pelo contrato ou pelo projeto/portal.

- Pix e boleto: uma cobrança para cada valor e vencimento aprovado.
- Cartão, com parcelamento escolhido pelo cliente: entrada separada, se houver, e saldo em uma compra parcelada. Limite de 12 parcelas e mínimo de R$ 5,00 por cobrança/parcela. Não há parcelamento adicional das mensalidades.
- Cartão, com parcelas personalizadas pelo escritório: cobranças separadas pelos valores aprovados. A tela e o contrato explicam essa diferença.
- À vista: uma cobrança, com o desconto previamente oferecido pelo escritório.
- Sem Asaas ativo: somente Pix combinado diretamente com o escritório; o projeto mantém QR Code e copia e cola quando a chave estiver cadastrada.

Os dados de cartão são informados na fatura do Asaas. Assinatura e confirmação do pagamento são etapas separadas. O webhook existente continua responsável pela baixa e pelo recibo; a recuperação de links também concilia cobranças já confirmadas. Aditivos mantêm seu fluxo independente.

Propostas antigas já aprovadas, ainda sem escolher a forma, pedem essa escolha no contrato e preservam valores e parcelas. Cobranças ou pagamentos já existentes impedem trocar a forma. Contratos assinados mantêm o texto congelado. O botão **Ver pagamento como cliente**, no contrato e no projeto do escritório, abre o link público válido já emitido; não gera nem reenvia links.

## Recuperação de falhas

O preparo usa uma trava por contrato e consulta a referência externa antes de criar cobranças. Uma solicitação persistente registra a tentativa antes do POST ao Asaas. Em timeout ou resposta ambígua, outra tentativa primeiro consulta o Asaas; a ausência de confirmação impede um novo POST. Caso essa situação persista, o suporte deve conferir a conta Asaas e a referência externa antes de liberar a solicitação. Não apagar solicitações ou gerar outra cobrança sem essa conferência.

Links e identificadores de cada parcela são salvos individualmente, com um link comum para o saldo parcelado no cartão. Falha ao salvar é recuperada consultando o mesmo pagamento. O botão **Ir para pagamento** permite concluir parcelas restantes; abrir a página apenas consulta o estado.

## Implantação e validação

Aplicar `supabase/migrations/0043_fluxo_pagamento.sql` e publicar o código correspondente. Essa migração é independente de `0042_pedido_repetido.sql`.

```powershell
node scripts/test-fluxo-pagamento.mjs
node scripts/test-formatacao.mjs
node scripts/verificar-migracao-pagamento.mjs
npm.cmd run build
```

O primeiro teste simula Asaas e banco sem carregar `.env.local` nem acessar a rede. Verifica cartão, Pix, boleto, centavos, assinatura, concorrência, timeout e recuperação de links, inclusive após confirmação parcial. O teste SQL cria registros fictícios numa transação com rollback, sem chamar o Asaas. Verifica aprovação, limites, assinatura, contrato antigo, valores, permissões, link vencido e trava.

Backups locais em `.backups`: código anterior, definições e permissões das funções do banco e SQL de retorno. Para voltar, restaurar o código anterior junto das funções antigas. Preservar as colunas/tabelas de pagamento e os identificadores Asaas já criados; cobranças externas exigem conferência antes de qualquer cancelamento. Os testes não efetuam pagamento nem geram cobrança real. A confirmação de uma transação real depende do cliente e da conta Asaas.

Referências: [parcelamento Asaas](https://docs.asaas.com/docs/criar-uma-cobranca-parcelada) e [fatura para cartão](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito).
