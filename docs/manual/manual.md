# Manual do NorteArq

Fonte única do manual. Atualizada a cada entrega (regra no CLAUDE.md). Daqui saem:
1. **Manual de suporte** (para o Igor): tudo, inclusive o "Como resolver".
2. **Central de ajuda** dentro do sistema (para os arquitetos): versão curta dos capítulos.
3. **Perguntas frequentes** da área do cliente final: capítulo 14.

A central de ajuda (menu **Ajuda**) e as perguntas frequentes do cliente leem este arquivo direto. Trechos só
para o suporte ficam entre `<!-- suporte -->` e `<!-- /suporte -->` e não aparecem para os arquitetos.

O PDF é gerado a partir deste texto. O antigo `Manual-NorteArq.pdf` (01/10/2026) está desatualizado.

Situação de cada capítulo: ✅ escrito · 🟡 parcial · ⬜ a escrever (o PDF completo sai depois da revisão de UX).

| # | Capítulo | Situação |
|---|---|---|
| 1 | Como o NorteArq funciona (a jornada do cliente) | ✅ |
| 2 | Primeiro acesso, configuração e marca do escritório | ✅ |
| 3 | Equipe e perfis (Dono, Administrador, Colaborador) | ✅ |
| 4 | Pedidos de orçamento e filtro de compatibilidade | ✅ |
| 5 | Clientes, links pelo WhatsApp e cadastros repetidos | ✅ |
| 6 | Briefing, quiz de estilo e Perfil do Cliente | ✅ |
| 7 | Propostas e modelos | ✅ |
| 8 | Contratos e aceite eletrônico | ✅ |
| 9 | Pagamentos e recibos | ✅ |
| 10 | Projeto: etapas, arquivos, revisões, aditivos | ✅ |
| 11 | Notificações e e-mails automáticos | ✅ |
| 12 | Plano, teste grátis e assinatura | ✅ |
| 13 | Suporte: relatar problema, telas de erro e painel interno | ✅ |
| 14 | Área do cliente final e perguntas frequentes | ✅ |
| 15 | **Como resolver** (dúvidas dos clientes) | ✅ |

---

## 1. Como o NorteArq funciona ✅

O escritório divulga **um link** (bio do Instagram, WhatsApp). Daí em diante:

1. **Pedido de orçamento:** o cliente preenche o formulário do escritório. O pedido chega em Contatos já
   classificado (compatível, fora do perfil ou a avaliar).
2. **Virar cliente:** um clique transforma o pedido em cadastro, sem redigitar nada.
3. **Proposta:** montada a partir dos modelos do escritório e enviada por link no WhatsApp. O cliente aprova,
   pede ajuste ou recusa.
4. **Contrato:** gerado da proposta aprovada. O cliente confere CPF e endereço e assina no próprio link.
5. **Projeto criado sozinho:** com as etapas padrão, as revisões e visitas da proposta e as parcelas em
   Pagamentos. O cliente é convidado a criar o acesso ao portal.
6. **Briefing detalhado e quiz de estilo:** o cliente responde sozinho; o escritório recebe o Perfil do Cliente.
7. **Etapas com aprovação:** cada etapa vai ao cliente com os arquivos; ele aprova ou pede revisão. Revisões
   contadas, aditivos aprovados pelo cliente.

O cliente final **nunca instala nada** e sempre vê a marca do escritório. Cada passo deixa registro com data,
hora e IP.

## 2. Primeiro acesso, configuração e marca ✅

**Cadastro:** nome, escritório, WhatsApp, e-mail e senha. Começa o teste grátis de 14 dias.

**Configuração inicial** (4 passos; tudo pode ser mudado depois em Configurações):
1. **Sua marca:** nome do escritório, endereço do formulário (o fim do link, ex.: `/e/studio-ana`), WhatsApp,
   logo (PNG, JPG ou WEBP até 2 MB) e cor principal. O cliente vê essa logo e essa cor no formulário, nos
   links e no portal.
2. **Serviços:** Arquitetura, Interiores, Reforma e Legalização já vêm prontos. Dá para desmarcar, renomear,
   criar outros e dizer se cada um tem briefing. Para quem tem briefing, o "Bloco do briefing" decide quais
   perguntas entram quando o cliente contrata esse serviço — o sistema sugere pelo nome, mas dá para trocar.
3. **Faixa de preço e agenda:** valor mínimo (abaixo dele o pedido chega "fora do perfil"; em branco, todos
   chegam "a avaliar"), valor máximo (acima dele vem o aviso "acima da sua faixa") e a data em que pode
   começar um projeto novo (antes dela, aviso "prazo apertado").
4. **Briefing:** depois do contrato (recomendado) ou antes da proposta. A escolha muda o "próximo passo" na
   ficha do cliente: o briefing é sugerido logo que ele vira cliente, ou quando o contrato é assinado.

No fim aparece o **link do escritório** para copiar ou mandar.

**Configurações** (menu): link do formulário, Equipe (só o Dono), marca, serviços, faixa de preço e agenda,
**Parcelamento** (entrada em %, até quantas vezes, desconto à vista de até 30%; vale para as próximas
propostas), briefing e **Modelos e textos prontos** (atalhos para o editor de briefing, os modelos de
proposta e de contrato e, para o Dono, o plano).

**Link do formulário:** fica no primeiro cartão de Configurações, com **Copiar link** e **Enviar no WhatsApp**.
Para mudar o fim do link, use **Mudar o endereço do formulário** em Minha marca. Atenção: o endereço antigo
para de funcionar, então atualize a bio do Instagram e os links que você já mandou.

**Tela Início (o seu dia):** mostra só o que pede ação, com o nome do cliente e um botão que leva direto
para resolver. No topo, um resumo: quantas tarefas urgentes, para hoje, pendências e o que espera o cliente.
- **Para fazer**, em três grupos:
  - **Urgente:** parcela atrasada (botão Cobrar), etapa com prazo vencido e despesa vencida.
  - **Vence hoje:** etapa com entrega planejada para hoje e despesa que vence hoje.
  - **Pendências**, da mais antiga para a mais nova: pedido de orçamento, briefing respondido, cliente sem
    proposta, proposta com ajuste pedido, proposta aprovada sem contrato, contrato para enviar, revisão
    pedida e revisão além do limite (cortesia ou aditivo).
  - Aparecem oito tarefas; as outras ficam em "Ver mais".
- **Esperando o cliente:** proposta, assinatura, aprovação de etapa e aditivo, com há quantos dias foi enviado.
  A partir de 7 dias aparece **Lembrar cliente**.
- **Entregas da semana:** etapas com prazo (atrasadas, de hoje e dos próximos 7 dias). Sem nenhuma entrega
  com data, o quadro avisa e lembra de definir os prazos em Projetos. Etapa com o cliente não vira tarefa do
  escritório.
- **Financeiro do mês** (Dono e Administrador): recebido no mês (contratos e outras entradas), a receber,
  em atraso e despesas a pagar.
- Projetos pausados, entregues ou encerrados não geram tarefas. O Colaborador vê só projetos e prazos, sem valores.

**Primeiros passos** (dono e administrador, no topo do painel até tudo estar feito): dados do escritório no
contrato, um modelo de proposta, o primeiro cliente, o primeiro briefing e a primeira proposta enviados.

**Menu:** a tela atual fica destacada. "Obras" volta ao menu quando o módulo de obra existir. No celular, o
menu fica recolhido no botão **Menu** (o sininho continua à vista) e fecha sozinho ao trocar de tela.

**Busca:** Clientes, Propostas, Contratos, Projetos e Briefings têm busca pelo nome do cliente.

**Ajuda** (menu): este manual, com índice e busca por palavra. Não achou? "Relatar problema ou sugestão".

**Instalar o NorteArq como aplicativo** (celular e computador): ganha ícone na tela e abre em tela cheia.
- **Android, Chrome ou Edge no computador:** no menu, **Instalar aplicativo** (aparece quando o navegador permite).
- **iPhone:** abra no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**. O botão
  "Instalar aplicativo" no menu mostra esse passo a passo.
- Só o sistema do arquiteto vira aplicativo. As páginas do cliente final mostram a logo do escritório na aba do
  navegador (quando o escritório tem logo).

## 3. Equipe e perfis ✅

| Ação | Dono | Administrador | Colaborador |
|---|:-:|:-:|:-:|
| Clientes, briefings, projetos e arquivos | ✅ | ✅ | ✅ |
| Pedidos de orçamento | ✅ | ✅ | ❌ |
| Propostas, contratos, pagamentos, aditivos | ✅ | ✅ | ❌ |
| Cortesia ou cobrança de revisão extra | ✅ | ✅ | ❌ |
| Excluir e juntar clientes | ✅ | ✅ | ❌ |
| Configurar o escritório (inclui o editor de briefing) | ✅ | ✅ | só vê |
| Estornar pagamento, anonimizar cliente | ✅ | ❌ | ❌ |
| Equipe e assinatura | ✅ | ❌ | ❌ |

- Equipe só no plano Escritório (ou no teste grátis): até 5 pessoas contando o dono e os convites pendentes.
- O convite vale 7 dias e chega por e-mail; também dá para copiar o link e mandar.
- **Uma conta pertence a um escritório só.** Quem já tem conta em outro escritório não pode ser convidado.
- O Colaborador recebe só as notificações de briefing e de etapa.
- Ações sem volta (excluir, anonimizar, juntar, estornar, cancelar contrato, remover membro) pedem a senha
  de quem está logado.

## 4. Pedidos de orçamento e filtro de compatibilidade ✅

**O formulário** (o link do escritório, com a marca dele) pede: nome, WhatsApp (obrigatório), e-mail,
serviços, área em m², local, quanto pretende investir, quando quer começar, mensagem e o aceite da política
de privacidade. Leva uns 2 minutos.

**O filtro só sinaliza; quem decide é o escritório:**

| Situação | Como o pedido chega |
|---|---|
| Investimento igual ou acima do mínimo | **Compatível** |
| Investimento abaixo do mínimo | **Fora do perfil** |
| Não informou o investimento, ou o escritório não definiu o mínimo | **A avaliar** |
| Investimento acima do máximo | Aviso "Acima da sua faixa" (continua compatível) |
| Quer começar antes da próxima data livre | Aviso "Prazo apertado" |

**Tela Contatos:** abas Em aberto, Compatíveis, A avaliar, Fora do perfil e Encerrados, com a contagem.
Selo "Novo" até o pedido ser visto. Em cada pedido:
- **Virar cliente:** cria o cadastro com tudo o que ele preencheu e abre a ficha;
- **Responder no WhatsApp:** abre com a mensagem pronta;
- trocar a classificação (Compatível, Fora do perfil, A avaliar);
- **Encerrar** com motivo obrigatório (orçamento, prazo, escopo, não respondeu, outro); dá para **Reabrir**;
- **Excluir:** para spam ou teste, com confirmação. Pedido que já virou cliente só sai pela ficha do cliente.

**Repetições:** o mesmo WhatsApp em menos de 10 minutos é ignorado (clique duplo). A mesma pessoa reenviando
em até 7 dias atualiza o pedido aberto, que volta a aparecer como "Novo".

O escritório recebe aviso no sininho e por e-mail a cada pedido novo. Pedidos só chegam a escritório que
terminou a configuração inicial.

## 5. Clientes, links e cadastros repetidos ✅

**Cadastros repetidos**
- CPF/CNPJ não repete no mesmo escritório: o sistema bloqueia.
- E-mail ou WhatsApp repetido mostra um aviso com o cadastro que já existe. Dá para abrir o existente ou
  marcar "não é a mesma pessoa: cadastrar mesmo assim".
- Na ficha do cliente aparece "Possível cadastro repetido" com o botão **Juntar com este** (dono ou
  administrador, pede a senha). Tudo do outro cadastro (propostas, contratos, briefings, projetos, links)
  passa para este, e o outro deixa de existir. Não dá para desfazer.
- Não dá para juntar: cliente anonimizado, dois cadastros que já têm acesso ao portal, CPF/CNPJ diferentes.
- O mesmo pedido de orçamento reenviado em até 7 dias atualiza o anterior ("atualizou o pedido").
- Ao converter um pedido em cliente, se o cliente já existe (mesmo e-mail ou WhatsApp), o pedido é ligado a ele.

**Ficha do cliente**
- No topo, o **próximo passo** da jornada com o botão certo: montar a proposta, gerar o contrato, enviar o
  briefing, revisar o Perfil do Cliente, abrir o projeto. Em cinza quando está esperando o cliente.
- Seção **Projeto** com as etapas aprovadas e o link (depois do contrato assinado).
- "Arquivar ou excluir" fica por último na coluna da direita.
- A **linha do tempo** mostra pedido, cadastro, propostas enviadas e respondidas, briefing, contrato assinado,
  etapas aprovadas e os links gerados.

**Links pelo WhatsApp** (ficha do cliente)
- Briefing, proposta, contrato e projeto têm cada um o seu link. Um link de briefing não abre a proposta.
- O botão abre o WhatsApp com a mensagem pronta; também dá para copiar o link.
- Briefing ainda aberto com link valendo: **Reenviar o mesmo link** ou **Copiar mensagem com o link**, sem
  desligar nada. "Gerar link novo" fica como opção à parte e pede confirmação.
- Gerar um link novo **desliga o anterior do mesmo tipo**.
- Validade: 30 dias (briefing, proposta, contrato) e 90 dias (projeto). O link não dá acesso ao portal.

**Arquivar, excluir e anonimizar**
- **Arquivar:** some da lista, nada é apagado; desarquivar traz de volta.
- **Excluir** (dono ou administrador, com senha): apaga o cliente e os arquivos dele. Não é possível se houver
  contrato assinado ou pagamento registrado: nesse caso, arquivar.
- **Exportar dados do cliente** (dono e administrador, LGPD): baixa um arquivo com tudo o que o escritório
  guarda dele (cadastro, pedido, briefing com perguntas e respostas, propostas, contratos com o aceite,
  projetos com etapas, aprovações, aditivos e pagamentos, links enviados). Arquivos e fotos vão listados pelo nome.
- **Anonimizar** (só o Dono, com senha, LGPD): troca os dados pessoais por "removido", apaga as fotos do
  briefing e o acesso ao portal. Contrato e valores ficam guardados (obrigação legal).

## 6. Briefing, quiz de estilo e Perfil do Cliente ✅

**Enviar:** na ficha do cliente, link de Briefing. Antes de gerar o link, o escritório escolhe quais blocos
(Arquitetura, Interiores, Reforma) e, em Interiores, quais ambientes vão no briefing — já vem marcado pelos
serviços que o cliente contratou, mas dá para ajustar. Nesse momento o sistema guarda uma cópia das perguntas:
mudar o modelo depois não mexe em briefing já enviado. Enquanto o cliente não respondeu, dá para voltar e
"Ajustar o que vai no briefing"; depois de respondido, só reabrindo.

**O que o cliente responde:** só os blocos escolhidos pelo escritório (Sua casa, Ambientes, Reforma), mais
"Rotina e referências", que vale para todos. Em Interiores ele escolhe, entre os ambientes liberados (sala,
quarto, cozinha, banheiro, varanda, home office), quais realmente entram no projeto dele.
- **Salva sozinho:** dá para parar e continuar depois pelo mesmo link.
- **Fotos e documentos:** JPG, PNG, WEBP ou PDF, até 10 MB cada e 20 por briefing.
- **Quiz de estilo:** uma imagem por vez, "gosto" ou "não gosto", sem o nome do estilo (para não influenciar).
  Só aparece se houver pelo menos 12 imagens disponíveis; usa até 24, as do escritório primeiro.
- Depois de enviar, o cliente não edita mais.

**Perfil do Cliente** (Briefings → abrir): estilo principal (e "com toques de..." para os secundários), mural
das imagens curtidas por estilo, as rejeitadas, respostas por bloco e fotos. Botões:
- **Validar com o cliente:** depois da reunião, vira o programa de necessidades oficial;
- **Reabrir para o cliente:** ele volta a editar pelo mesmo link;
- **Baixar PDF:** pela impressão do navegador ("Salvar como PDF").

Situações: Enviado, não aberto → Respondendo → Respondido → Validado.

**Editor de briefing** (dono e administrador; o Colaborador só vê)
- Ligar e desligar perguntas, mudar a ordem, editar o texto e a explicação.
- Perguntas padrão: muda só o texto e a explicação (dá para voltar ao texto original); desliga, mas não apaga.
- Perguntas próprias: texto, escolha única, múltipla escolha, número, sim/não ou fotos; editar e apagar.
- Limites: 100 perguntas próprias, 40 por grupo, 20 opções de até 80 letras, sem pergunta repetida no grupo.
- **Imagens do quiz:** subir as próprias (recortadas em 4:3), até 20 por estilo; esconder imagens padrão;
  "usar só as minhas"; "voltar ao padrão" do estilo. Estilos: Contemporâneo, Minimalista, Industrial,
  Clássico, Escandinavo, Rústico, Boho e Japandi.

## 7. Propostas e modelos ✅

**Criar:** na ficha do cliente. A proposta já vem com os serviços do cliente e, se houver, com o **modelo**
de cada serviço (Arquitetura + Interiores viram uma proposta só). Se o cliente já tem um rascunho, ele é aberto.

**Campos:** título, mensagem de abertura, serviços (escopo e entregáveis), valor total, pagamento, prazo,
**revisões incluídas** (no total do projeto; depois viram aditivo), **visitas à obra incluídas**,
deslocamento, o que não está incluído e validade (dias contados a partir do envio).

**Pagamento**
- **O cliente escolhe as parcelas:** entrada em %, saldo em até N vezes e desconto à vista opcional. A tela
  mostra as opções que o cliente vai ver. Parcelas iguais; a última absorve os centavos.
- **Parcelas do saldo vencem:** todo mês no dia da assinatura (padrão) ou **todo dia X** (1 a 28), a partir do mês
  seguinte à assinatura. A entrada vence no dia da assinatura. O cliente vê a regra na proposta e no contrato.
- **Parcelas manuais:** por etapa ou datas específicas. A soma precisa bater com o total para enviar.

**Deslocamento** (vira cláusula do contrato): incluído nos honorários, taxa fixa por visita, valor por km
ou reembolso das despesas (o cliente paga o que for gasto, sem valor fixo). Cada opção explica onde vai o
valor; se a observação tiver um valor em reais numa opção sem valor fixo, a tela avisa. Com cidade-sede, as visitas dentro dela não pagam deslocamento. A tela mostra
"Como o cliente vai ler".

**Salvamento:** o rascunho salva sozinho 3 segundos depois da última alteração; o rodapé mostra "Rascunho salvo
às 14:32" ou "Alterações ainda não salvas". Sair da página com algo não salvo pede confirmação. Se algum campo
estiver errado, o aviso aparece no rodapé, junto dos botões, e a tela rola até o campo.

**Revisar e enviar:** salva e abre a proposta exatamente como o cliente vai ler. Dali, **Voltar e ajustar** ou
**Enviar no WhatsApp**. Enviar fecha a versão (não edita mais) e gera o link. Exige valor total e pelo menos um
serviço. "Gerar link novo" desliga o anterior.

**O cliente responde pelo link:** **aprovar** (escolhendo como quer pagar), **pedir ajuste** (comentário
obrigatório) ou **recusar** (motivo: preço, prazo, escopo, outro profissional, desistiu, outro). Tudo com
data, hora e IP; o escritório é avisado.

- **Apagar rascunho** pede confirmação: tudo o que foi preenchido se perde.
- **Ajuste pedido:** criar **nova versão** (v2, v3...). O mesmo link passa a mostrar a versão nova.
- **Expirada:** passada a validade, o link mostra que a proposta venceu e o cliente não consegue aprovar.

**Modelos** (Propostas → Modelos)
- **Salvar como modelo** (no rodapé do rascunho, ao lado de Salvar rascunho, e embaixo das propostas já
  enviadas ou aprovadas): modelo novo ou substituindo um existente. Nome não repete.
- Valor no modelo: em branco ("cada projeto é um preço"), fixo, ou por m² (calculado com a área que o
  cliente informou no pedido de orçamento).
- Num rascunho: **Trocar modelo…** (substitui o conteúdo) ou **Em branco**.

## 8. Contratos e aceite eletrônico ✅

**Gerar:** na proposta aprovada, "Próximo passo: o contrato". O texto sai do **modelo de contrato** do
serviço, já preenchido com os dados do cliente, do escritório e da proposta.

**Modelos de contrato** (Contratos → Modelos): um padrão (não se apaga) e outros por tipo de projeto (ex.:
um pronto para Interiores), cada um ligado a serviços. Os **dados do escritório no contrato** (CPF/CNPJ,
endereço, responsável, registro no CAU/CREA) valem para todos os modelos. Campos automáticos como
`{{cliente.nome}}`, `{{proposta.valor_total}}`, `{{proposta.parcelas}}`, `{{proposta.revisoes}}`,
`{{proposta.deslocamento}}` e `{{data}}` (a lista completa aparece no editor).

**Antes de enviar:** o texto pode ser ajustado (até 60 mil caracteres) e o modelo pode ser trocado (substitui
o texto, inclusive os ajustes). **Depois de enviado, o texto não muda.**

**Contrato sem lacunas:** o botão de enviar fica travado enquanto faltar algum dado que o texto usa (CPF/CNPJ,
endereço, responsável ou registro do escritório; e-mail ou WhatsApp do cliente; valor do deslocamento) ou
houver "[a preencher]" escrito à mão. A tela lista o que falta, com atalhos. CPF/CNPJ e endereço do cliente
não travam: ele completa na hora de assinar. Se um campo não se aplica (ex.: sem registro no CAU), basta
tirá-lo do texto deste contrato.

**O cliente assina pelo link:** lê o contrato, confere e corrige nome completo, CPF/CNPJ (os dígitos são
verificados) e endereço do imóvel, marca que leu e concorda e clica **Assinar contrato**. Ficam registrados
data, hora, IP, navegador e um **código de verificação**. Os dois lados recebem e-mail de confirmação.

**Ao assinar, sozinho:** o projeto é criado com as etapas padrão e as revisões e visitas da proposta, as
parcelas entram em Pagamentos e o cliente vê o convite para criar o acesso ao portal.

**Cancelar** (com senha): só contrato ainda não assinado. O link deixa de valer.

O aceite é feito no próprio NorteArq. Assinatura com certificado ICP-Brasil (ZapSign ou Clicksign) ainda está
em estudo.

## 9. Pagamentos e recibos ✅

O NorteArq organiza o que foi combinado e recebido. O cliente paga ao escritório por Pix direto ou pela
conta Asaas conectada. Na cobrança automática, há tarifas do Asaas e a taxa de serviço NorteArq descrita abaixo.

- As parcelas da proposta (e dos aditivos aprovados) aparecem em Pagamentos, no contrato.
- **Registrar pagamento:** data (não pode ser no futuro), forma (Pix, transferência, boleto, cartão,
  dinheiro, outro) e observação ou nº do comprovante.
- Cada registro gera um **recibo numerado** com a marca do escritório. Botões **Recibo** (abrir) e
  **Enviar recibo** (WhatsApp com a mensagem pronta). O cliente também vê os pagamentos no projeto.
- **O registro é definitivo.** Errou? Só o Dono pode **estornar**, com motivo e senha. O recibo passa a
  aparecer como cancelado e o histórico fica guardado.
- O Colaborador não vê valores.
- A próxima etapa não é bloqueada por falta de pagamento (decisão em aberto).

**Vencimentos, Pix e lembretes**
- **Vencimento automático** das parcelas de contratos assinados: entrada e pagamento único no dia da assinatura;
  "Parcela k de n" mês a mês no dia da assinatura ou, se a proposta definiu, **todo dia X** a partir do mês seguinte;
  saldo em parcela única 1 mês depois (ou no dia X do mês seguinte); parcelas de aditivo mês a mês a partir da
  aprovação. Parcelas manuais (ex.: "na entrega do anteprojeto") ficam sem data: use **Definir vencimento**.
- **Alterar vencimento** (Dono e Administrador): em qualquer parcela não paga que já tem data. Nova data (de hoje
  até 2 anos), motivo opcional e a opção **mover também as próximas parcelas** pelo mesmo número de dias. O valor não
  muda. A cobrança no Asaas é atualizada sozinha e o **link de pagamento continua o mesmo**; os lembretes por e-mail
  passam a seguir a nova data. Depois de salvar, **Avisar o cliente no WhatsApp** abre a mensagem com as novas datas.
  A parcela mostra "Vencimento alterado em … (antes …)". Parcela paga e cartão parcelado não mudam de data.
- **Pix do escritório** (Configurações → Recebimento por Pix): tipo e chave, nome de quem recebe e cidade. Com isso,
  cada parcela em aberto mostra **Pagar com Pix** para o cliente (QR Code e copia e cola com o valor certo). O
  dinheiro cai direto na conta do escritório: o pagamento não passa pelo NorteArq, que não fica com nenhuma parte.
- **Lembretes automáticos ao cliente por e-mail**: 3 dias antes, no dia e 3 dias depois do vencimento, com o Pix
  copia e cola e o link do projeto. No atraso, o escritório recebe aviso no sininho.
- **Atrasada:** a parcela vencida aparece em vermelho para os dois lados, e o painel mostra o total **em atraso**.
- **Cobrar no WhatsApp:** botão em cada parcela em aberto, com valor, vencimento e o Pix copia e cola na mensagem.
- Quando o cliente pagar, o escritório confere no banco e usa **Registrar pagamento** (o recibo sai na hora).
**Cobrança automática pelo Asaas (opcional)**
- O sistema convida a ativar: faixa "Ativar cobrança automática" nos pagamentos do contrato e item nos
  Primeiros passos do painel (que conta como feito com o Pix cadastrado ou a cobrança ativa).
- Em Configurações → **Cobrança automática**, o **dono** conecta a conta Asaas do escritório: abre a conta grátis no
  Asaas (no nome dele ou do escritório), gera uma **chave de API sem permissão de saque** e cola no NorteArq,
  aceitando a taxa de serviço.
- **Tarifas:** a do Asaas (Pix, boleto ou cartão, pela tabela da conta dele) + **R$ 0,99 por parcela paga** de taxa
  NorteArq, descontada sozinha no pagamento. Parcela não paga não tem taxa.
- Parcelas que vencem nos próximos 10 dias ganham a cobrança sozinhas, todo dia; dá para gerar na hora pelo botão
  **Gerar cobrança**. O Asaas exige o **CPF ou CNPJ do cliente** na ficha.
- O cliente vê **Pagar agora (Pix, boleto ou cartão)** no projeto, no portal e nos lembretes por e-mail.
- Quando ele paga, o pagamento é **registrado sozinho**, com recibo, e o escritório é avisado no sininho com o valor
  líquido. A parcela mostra o extrato: pago, líquido e tarifas.
- Estorno ou cobrança apagada no Asaas: o escritório é avisado para conferir (o estorno do registro continua manual).
- Desativar (com senha): novas parcelas deixam de gerar cobrança; as já geradas continuam valendo no Asaas.

- O contrato padrão (modelos criados daqui para frente) traz a cláusula de **multa de 2% e juros de 1% ao mês** por
  atraso. Modelos já existentes não mudam: dá para acrescentar a frase no próprio modelo.

**Financeiro do escritório**
- O menu **Financeiro** reúne as parcelas dos contratos assinados e as despesas. Disponível nos planos
  Profissional e Escritório e durante o teste grátis, para Dono e Administrador.
- **Visão geral:** recebido no mês, todas as parcelas a receber, parcelas vencidas e despesas pagas no mês.
  O gráfico compara entradas confirmadas e despesas pagas nos cinco meses até o mês selecionado.
- **Contas a receber:** todas as pendências, independentemente do vencimento, e os pagamentos confirmados
  no mês escolhido. Busque pelo cliente ou projeto e filtre por situação.
- **Cobrar no WhatsApp:** em cada parcela não paga, direto na lista, quando o cliente tem WhatsApp na ficha. Abre a
  conversa com a mesma mensagem do contrato (valor, vencimento e o link de pagamento do Asaas ou o Pix copia e cola).
- **Registrar pagamento:** disponível para recebimentos manuais; gera o mesmo recibo do contrato.
  Cobranças ligadas ao Asaas são confirmadas automaticamente. Para abrir o recibo ou estornar, use **Ver contrato**.
- **Despesas:** todas as pendências e as despesas pagas no mês escolhido. Em **Nova despesa**, informe descrição,
  categoria, valor e vencimento; fornecedor e observação são opcionais. Se já pagou, marque a opção e informe a data.
- **Registrar pagamento** da despesa só registra o que já foi pago. **Cancelar despesa** exige motivo e retira
  o registro dos totais, preservando o histórico. Essas ações não movimentam dinheiro na conta bancária.
- **Asaas:** saldo disponível, valores confirmados a liberar e taxas das cobranças pagas no mês, considerando
  toda a conta conectada. A consulta pode levar até cinco minutos para atualizar. Valores indisponíveis aparecem
  como travessão e com aviso; ambiente de testes é identificado.
- No **modo leitura**, os registros podem ser consultados, mas nenhum pagamento ou despesa pode ser registrado.
- **Esconder valores:** o ícone de olho, ao lado do título "Financeiro", desfoca os totais (cartões, gráfico e
  saldo do Asaas) — útil para olhar a tela perto de outras pessoas. Começa sempre escondido e lembra a escolha
  no aparelho; o mesmo olho aparece ao lado do título "Financeiro de [mês]" na tela Início.

**Outras entradas (RT, aportes e reembolsos)**
- Em **Nova entrada**, registre o que o escritório recebeu fora dos contratos: RT de loja, serviço avulso, aporte,
  empréstimo, reembolso ou outros. Informe descrição, categoria, valor, data e a origem (opcional).
- A data não pode ser futura. A entrada entra em "Outras entradas" na visão geral, separada dos contratos.
- Não dá para editar uma entrada. Se errar, use **Cancelar entrada** e informe o motivo; ela sai dos totais e o
  histórico fica guardado. Depois, registre a entrada correta.

**Fornecedores**
- O menu **Fornecedores** (Dono e Administrador, nos planos com o Financeiro) guarda lojas, marmorarias, marcenarias
  e outros parceiros, para você escolher em vez de digitar o nome de novo.
- Em **Novo fornecedor**, informe o nome. CPF/CNPJ, segmento, contato, telefone, e-mail e observações são opcionais.
  O CPF/CNPJ não pode se repetir no mesmo escritório. Use a busca e o filtro Ativos/Arquivados para achar um cadastro.
- Nas telas **Nova entrada** e **Nova despesa**, escolha o fornecedor na lista ou clique em **Cadastrar fornecedor**
  sem sair da tela. Também dá para informar o nome na mão, sem cadastro.
- O nome fica gravado no lançamento no dia do registro. Editar ou arquivar o fornecedor depois **não muda**
  os lançamentos antigos.
- **Arquivar** tira o fornecedor da lista de novos lançamentos e preserva o histórico; **Reativar** traz de volta.
  **Excluir permanentemente** só funciona se ele nunca foi usado em entrada ou despesa (inclusive canceladas);
  caso contrário, arquive.

## 10. Projeto: etapas, arquivos, revisões, aditivos ✅

**Situação e encerramento**
- Dono e administrador podem **Pausar**, **Concluir entrega**, **Encerrar**, **Retomar** ou **Reabrir**.
- Pausar e encerrar pedem um motivo. A mudança registra autor, data, situação anterior e motivo no histórico.
- **Concluir entrega** exige pelo menos uma etapa, todas aprovadas, e nenhum aditivo aguardando resposta.
- Projetos pausados, entregues ou encerrados preservam os arquivos e o histórico, mas bloqueiam alterações
  do trabalho e respostas do cliente. O cliente vê a situação e continua consultando os arquivos disponíveis.
- Pausar reserva a vaga do plano. Encerrar libera a vaga; reabrir um projeto incompleto depende de vaga disponível.
- Encerrar o trabalho não cancela contratos, parcelas ou cobranças. Os pagamentos continuam disponíveis.

**Prazos e agenda**
- Em cada etapa não aprovada, use **Alterar prazo** para definir ou retirar a data de entrega planejada.
  Dono, administrador e colaborador podem editar; cada alteração fica no histórico.
- A data também aparece para o cliente. Etapa aprovada conserva a data registrada.
- A tela **Projetos** reúne atrasos e entregas dos próximos sete dias, com a próxima ação indicada para
  o escritório ou o cliente. A agenda inclui apenas projetos em andamento e etapas ainda não aprovadas.
- Ao retomar um projeto, revise os prazos. As datas não são adiadas automaticamente.

**Etapas**
- Padrão: Estudo preliminar → Anteprojeto → Aprovações externas → Projeto executivo → Entrega.
- Adicionar, renomear, excluir e reordenar. Etapa aguardando o cliente ou aprovada não se move.
- **Enviar para aprovação:** precisa de pelo menos 1 arquivo visível ao cliente. Pede confirmação dizendo
  quantos arquivos vão; gera o link do projeto para o WhatsApp, e o cliente também recebe e-mail.
- O cliente **aprova** ou **pede revisão** (comentário obrigatório). A aprovação não se desfaz: mudança
  depois dela vira aditivo.
- Contador visível para os dois lados: "2 de 3 revisões usadas".
- Etapa em revisão: **"O cliente pediu"** aparece no topo da etapa, com o comentário dele.
- No topo do projeto, link para o **Perfil do Cliente** (briefing respondido ou validado).

**Arquivos**
- Antes do botão de enviar arquivos, a opção "Os próximos arquivos ficam visíveis ao cliente" (vale para os
  arquivos enviados depois de marcar).
- Cada arquivo de etapa tem um tipo: Prancha técnica, Documento ou Outro (sugerido pela extensão; imagem com
  "planta", "layout", "corte", "humanizada" e parecidos no nome entra como Prancha técnica). Render não é tipo de
  arquivo de etapa: tem espaço próprio (abaixo).
- Imagens e PDFs ganham miniatura. Clicar abre o visualizador: zoom (roda do mouse, pinça, duplo toque),
  páginas do PDF, troca de revisão, **Baixar** (com o nome certo, ex.: "Planta - Rev02.pdf") e **Nova aba**.
- DWG, SKP e outros formatos técnicos só baixam.
- Mesmo nome na mesma etapa = versão nova (Rev01, Rev02...). A anterior nunca é apagada.
- Limite de 50 MB por arquivo; o total conta no espaço do plano (2 / 30 / 150 GB). Aviso a partir de 80%.
- **O cliente só vê o que já foi enviado:** arquivo visível de uma etapa enviada para aprovação.
  Arquivo novo numa etapa em andamento ou em revisão aparece com "vai no próximo envio".
- Arquivo só pode ser apagado enquanto a etapa não foi enviada ao cliente.
- **Renders do projeto:** espaço próprio, abaixo do link do cliente, fora das etapas e sem aprovação. Toque em
  **Adicionar renders** e escolha as imagens (JPG, PNG ou WEBP; até 12 por projeto). O cliente já vê e pode
  abrir ou baixar. Ficam numa linha com setas para os lados; clicar abre a imagem. A lixeira exclui.
- **Capa:** o render escolhido na estrela ou, sem escolha, o primeiro adicionado. Aparece como faixa no topo do
  projeto e na lista de projetos. Sem render, o projeto fica sem capa.
- **Para o cliente:** a capa e os renders ficam no topo da página dele.

**Lembretes e revisões**
- Etapa esperando aprovação: o cliente recebe e-mail com 3 e com 7 dias. No de 7 dias, o escritório também é
  avisado no sininho. Reenviar a etapa recomeça a contagem.
- Quando o cliente usa a última revisão incluída, ou passa do limite, os dois lados são avisados. Revisão
  além do limite: o escritório escolhe **Conceder como cortesia** (pede confirmação) ou **Cobrar como aditivo**.

**Aditivos**
- Descrição, valor, impacto no prazo (dias), revisões e visitas extras e número de parcelas (1 a 24).
- O cliente aprova ou recusa (com motivo) pelo link do projeto. O escritório pode cancelar enquanto ele não
  respondeu.
- Aprovado: as parcelas entram em Pagamentos e as revisões e visitas extras somam ao projeto. Recusado: a
  revisão excedente que originou o aditivo volta a ficar em aberto.

**Aprovações externas** (condomínio, prefeitura, bombeiros...): órgão, protocolo, data de entrada e situação
(Em preparação, Em análise, Com exigência, Aprovado, Indeferido). Não dependem do cliente, mas ele acompanha.

## 11. Notificações e e-mails automáticos ✅

**Sininho**
- O número vermelho mostra as novidades não vistas e **zera ao abrir o sininho**.
- Abas **Não lidas** (padrão) e **Todas**. Abrir a notificação, ou entrar na página daquele item (projeto,
  briefing, proposta...), marca como lida.
- X dispensa uma notificação; **Limpar lidas** tira todas as lidas da lista.
- Novidades do mesmo item aparecem agrupadas ("+2 novidades aqui").
- A leitura é de cada pessoa da equipe. Lidas saem da lista após 30 dias; tudo é apagado após 90 dias.

**E-mails automáticos** (o sininho funciona sempre)

<!-- suporte -->
Os e-mails só saem com o Resend configurado na Vercel (`RESEND_API_KEY` e `EMAIL_REMETENTE`).
<!-- /suporte -->

| Quando | Quem recebe |
|---|---|
| Pedido de orçamento novo | Escritório |
| Briefing respondido (com o estilo principal) | Escritório |
| Proposta aprovada, com ajuste pedido ou recusada | Escritório |
| Contrato assinado (com o código de verificação) | Escritório e cliente |
| Etapa enviada para aprovação | Cliente |
| Etapa sem resposta há 3 e 7 dias | Cliente (no de 7 dias, o escritório pelo sininho) |
| Etapa aprovada ou revisão pedida | Escritório |
| Última revisão incluída usada ou limite passado | Escritório e cliente |
| Aditivo aprovado ou recusado | Escritório |

Os links de briefing, proposta e contrato não saem por e-mail: o escritório manda pelo botão do WhatsApp.

## 12. Plano, teste grátis e assinatura ✅

| | Briefing | Profissional | Escritório |
|---|---|---|---|
| Mensal | R$ 49 | R$ 97 | R$ 197 |
| Anual (2 meses grátis) | R$ 490 | R$ 970 | R$ 1.970 |
| Pessoas | 1 | 1 | Até 5 |
| Espaço para arquivos | 2 GB | 30 GB | 150 GB |
| Pedidos, proposta, contrato, projeto | ❌ | ✅ | ✅ |

- Teste grátis de 14 dias com tudo do Profissional (e equipe liberada), sem cartão.
- **Assinar** (Plano e assinatura, só o Dono): escolhe plano e período, informa o CPF ou CNPJ de quem paga e
  vai para a página segura do Asaas (Pix, boleto ou cartão). O NorteArq não vê dados de cartão. Assinando
  durante o teste, a primeira cobrança só vence no fim dele.
- **Trocar de plano:** a próxima cobrança já sai com o valor novo. Indo para um plano menor, nada se perde,
  mas não dá para criar itens novos além do limite.
- **Cancelar** (com senha): sem multa; o acesso vale até o fim do período pago e depois entra em modo leitura.
- Situações: Teste grátis → Assinatura em dia → Pagamento em atraso (7 dias de tolerância) → **Modo leitura**
  (vê tudo, não cria nada) → Conta suspensa (dados guardados). Sem pagamento no fim do teste, são 30 dias de
  modo leitura antes da suspensão.
- Em qualquer situação, **o cliente final continua acessando os projetos**.
- Equipe num plano sem equipe: os membros ficam sem acesso até o escritório voltar ao plano Escritório.
- **Limites do plano:** plano Briefing, 15 briefings novos por mês (volta no dia 1º); plano
  Profissional e teste grátis, 15 projetos em andamento. Um projeto está "em andamento" enquanto tiver etapa
  não aprovada: aprovou todas, a vaga volta. No limite, o que trava é gerar contrato novo (a assinatura do
  cliente nunca é bloqueada). O painel avisa a 2 vagas do fim. Nada é perdido ao passar do limite.

## 13. Suporte: relatar problema, telas de erro e painel interno ✅

**Relatar problema ou sugestão** (menu lateral, para todos da equipe)
- Escolhe Problema, Sugestão ou Dúvida e escreve (até 2.000 caracteres).
- A página em que a pessoa estava vai junto, automaticamente.
- Quem administra o NorteArq recebe por e-mail. Limite de 20 relatos por pessoa por dia.

**Telas de erro**
- Se algo quebrar, aparece "Algo deu errado nesta tela", com **Tentar de novo** e **Voltar ao início**.
- O erro já foi avisado automaticamente. Nada do que foi salvo antes se perde.
- O **código do erro** que aparece embaixo ajuda o suporte a achar o que aconteceu: mande junto ao relatar.
- Dentro do sistema, há também o botão "Contar o que eu estava fazendo".

<!-- suporte -->
**Painel interno** (`/app/interno`, só para quem administra o NorteArq)
- **Relatos:** de quem, de qual escritório, página e texto. Botões Responder (abre o e-mail), Marcar como
  visto e Resolvido.
- **Erros automáticos** dos últimos 30 dias: página, quantas vezes aconteceu, escritório e detalhes técnicos.
  O mesmo erro na mesma página em 24 h é contado como um só. E-mail de aviso só na primeira vez.
- Quem administra é definido na Vercel pela variável `NORTEARQ_ADMINS` (e-mails separados por vírgula).
<!-- /suporte -->

<!-- suporte -->
**Asaas (assinatura do NorteArq)** (só suporte)
- Conta de produção no CPF do Igor (agenciaberrielmkt@gmail.com). Chave na Vercel (`ASAAS_API_KEY`,
  `ASAAS_AMBIENTE=producao`); no computador, `ASAAS_API_KEY` é a de teste e `ASAAS_API_KEY_PRODUCAO` a real.
- Webhook: https://nortearq.com.br/api/asaas/webhook, senha em `ASAAS_WEBHOOK_TOKEN` (Vercel) e
  `ASAAS_WEBHOOK_TOKEN_PRODUCAO` (computador). Eventos: pagamento confirmado, recebido, vencido e estornado.
- A chave não tem permissão de saque: saques só pelo painel ou app do Asaas.
- Cobrança automática dos escritórios: chaves dos arquitetos criptografadas com `COBRANCA_CHAVE` (Vercel e
  .env.local). **Não perder essa chave**: sem ela, as conexões salvas não abrem e cada escritório teria de conectar de
  novo. Split de R$ 0,99 vai para a carteira `ASAAS_CARTEIRA_NORTEARQ`. Avisos em /api/asaas/cobrancas?e=<escritório>.
- Link de indicação do Asaas (créditos para você e o arquiteto): colocar em `NEXT_PUBLIC_ASAAS_INDICACAO` na Vercel.
<!-- /suporte -->

<!-- suporte -->
**Cópia de segurança** (só suporte)
- Todo dia às 03:00 de Brasília, o GitHub Actions (`.github/workflows/backup.yml`, script `scripts/backup.mjs`)
  copia para o Cloudflare R2, balde `nortearq-backup` (conta agenciaberrielmkt@gmail.com):
  `banco/AAAA-MM-DD/completo.dump` (pg_dump completo), `banco/AAAA-MM-DD/dados.sql.gz` (dados de public + logins)
  e `arquivos/<balde>/<caminho>` (arquivos novos do Storage).
- Cópias do banco ficam 30 dias. Se falhar, chega e-mail para igorbritoberriel@gmail.com.
- Rodar na hora: GitHub → nortearq → Actions → "Cópia de segurança" → Run workflow.
- Restaurar: projeto Supabase novo → aplicar as migrações de `supabase/migrations` → `psql < dados.sql` (ou
  `pg_restore` do completo.dump) → copiar `arquivos/` de volta para o Storage.
<!-- /suporte -->

## 14. Área do cliente final e perguntas frequentes ✅

**Como o cliente acessa**
- **Links no WhatsApp** (sem senha): cada link abre só aquele item, com a marca do escritório.
- **Portal** (com senha): depois do contrato assinado, o link do contrato e o do projeto mostram
  "Crie seu acesso ao portal". O cliente cria uma senha (mínimo de 8 caracteres) e já entra. Depois, entra
  pela página Entrar com e-mail e senha e vê todos os projetos, contrato, proposta e recibos num lugar só,
  com "O que precisa de você" no topo. Os links do WhatsApp continuam valendo.

**Falar com o escritório:** botão no topo de todas as páginas do cliente (links e portal), que abre o
WhatsApp do escritório.

Quando há etapa ou aditivo esperando por ele, o aviso no topo tem o botão **Ver e responder**, que leva
direto ao ponto da página.

**Dúvidas frequentes:** no fim de todas as páginas do cliente (links e portal) aparecem as perguntas abaixo,
abrindo uma por vez.

**No projeto o cliente vê:** etapas e o que está esperando por ele, arquivos já enviados (ver e baixar),
revisões usadas, aditivos para aprovar ou recusar, aprovações externas e pagamentos.

**Perguntas frequentes** (texto para o cliente final)
- **Preciso instalar algum aplicativo?** Não. Tudo abre no navegador do celular ou do computador.
- **Posso parar o briefing no meio?** Sim. As respostas são salvas sozinhas; é só abrir o mesmo link depois.
- **Errei uma resposta e já enviei o briefing.** Peça ao escritório para reabrir: você volta a editar pelo
  mesmo link.
- **O link diz que não vale mais.** O link venceu ou o escritório mandou um mais novo. Peça um link novo.
- **Quero mudar algo na proposta.** Use "Pedir ajuste" e escreva o que quer mudar. O escritório manda uma
  versão nova no mesmo link.
- **Minha proposta expirou.** Fale com o escritório para receber uma nova.
- **O aceite do contrato tem validade?** O aceite eletrônico registra data, hora, IP, navegador e um código de
  verificação, e você recebe a confirmação por e-mail.
- **Aprovei uma etapa por engano.** A aprovação não se desfaz. Fale com o escritório: mudanças depois da
  aprovação são combinadas como aditivo.
- **Quantas revisões eu tenho?** O contador aparece no projeto ("2 de 3 revisões usadas"). Além do
  combinado, a revisão pode ser cobrada; você é avisado antes.
- **O que é um aditivo?** Um serviço além do contratado. Nada é cobrado sem a sua aprovação.
- **Não aparece o arquivo que me falaram.** Ele aparece quando o escritório enviar a etapa para você.
- **Onde estão meus recibos?** No portal e nos links que o escritório manda depois de cada pagamento.
- **Esqueci a senha do portal.** Na página Entrar, use "Esqueci a senha".

---

## 15. Como resolver ✅

| O cliente diz | Causa provável | O que fazer |
|---|---|---|
| Cobrança automática mostra "conta de teste" | A chave colada é do ambiente de testes do Asaas (sandbox.asaas.com, começa com $aact_hmlg); o site não gera cobrança com ela | Na conta real (www.asaas.com), Integrações > Chaves de API, gerar a chave ($aact_prod); em Configurações, desativar e conectar de novo |
| "Não consigo salvar o Pix" em Configurações | Só o dono do escritório muda a chave Pix (administrador e colaborador não) | Entrar com o login do dono; nome até 25 letras e cidade até 15 |
| "O link não abre" / "link inválido" | O link venceu ou foi substituído por um mais novo | Na ficha do cliente, gerar o link de novo (o anterior deixa de valer) |
| "Não recebi o e-mail" | E-mail errado no cadastro, caixa de spam, ou e-mail do sistema não configurado | Conferir o e-mail na ficha; mandar o link pelo botão do WhatsApp |
| "Não aparece o arquivo que vocês mandaram" | A etapa ainda não foi enviada, ou o arquivo está como "interno" | Enviar a etapa para aprovação; conferir o olho (visível ao cliente) no arquivo |
| "Não aparece o render lá em cima" (ou o arquiteto não acha onde pôr) | O render foi enviado dentro de uma etapa (vira arquivo da etapa) ou está em HEIC | Em **Renders do projeto**, tocar em **Adicionar renders** e escolher a imagem em JPG, PNG ou WEBP |
| "Não consigo convidar alguém para a equipe" | O e-mail já tem conta em outro escritório, as 5 vagas estão ocupadas, ou o plano não tem equipe | Pedir outro e-mail; cancelar convites parados; plano Escritório |
| "O convite diz que não pode ser aceito" | A pessoa já tem escritório no NorteArq | Cancelar o convite e convidar com outro e-mail |
| "Não consigo cadastrar o cliente" | CPF/CNPJ já usado por outro cliente do escritório | Abrir o cadastro existente (aparece no aviso) |
| "Diz que já existe uma etapa/modelo com esse nome" | Nomes não repetem no mesmo projeto/escritório | Usar o nome sugerido (ex.: "Anteprojeto (2)") |
| "Minha colaboradora não vê propostas nem pedidos" | É a regra do perfil Colaborador | Mudar o perfil para Administrador (só o Dono) |
| "Não consigo enviar arquivo" | Arquivo acima de 50 MB ou espaço do plano acabou | Reduzir o arquivo; apagar arquivos sem uso; mudar de plano |
| "Não consigo criar nada" | Conta em modo leitura (teste acabou ou pagamento atrasado) | O Dono escolhe um plano ou regulariza em Plano e assinatura |
| "Não consigo apagar o arquivo" | A etapa já foi enviada ao cliente ou aprovada | Enviar uma versão nova com o mesmo nome |
| "Apareceu 'Algo deu errado'" | Erro no sistema (já registrado automaticamente) | Pedir o código do erro e procurar no painel interno |
| "Os pedidos de orçamento não chegam" | Configuração inicial não concluída, ou link digitado errado | Concluir a configuração; copiar o link em Configurações |
| "Todo pedido chega como 'a avaliar'" | Valor mínimo da faixa de preço em branco, ou o cliente não informou o investimento | Preencher a faixa de preço em Configurações |
| "Não consigo excluir o pedido" | O pedido já virou cliente | Arquivar ou excluir pela ficha do cliente |
| "O cliente não vê o quiz de estilo" | Menos de 12 imagens disponíveis (padrão escondidas demais) | Editor de briefing: subir imagens ou "voltar ao padrão" |
| "Mudei o briefing e o cliente vê o antigo" | Briefing já enviado guarda a própria cópia das perguntas | Normal: a mudança vale para os próximos briefings |
| "O cliente quer corrigir o briefing" | Briefing enviado não é editado pelo cliente | Perfil do Cliente → Reabrir para o cliente |
| "Não consigo editar a proposta" | Proposta enviada fica fechada | Criar nova versão (o mesmo link mostra a nova) |
| "Não consigo enviar a proposta" | Sem valor total ou serviço, ou parcelas manuais com soma diferente do total | Preencher; ajustar as parcelas |
| "O cliente quer pagar em outro dia" | A data foi combinada depois do contrato | Contrato → Pagamentos → **Alterar vencimento** (com "mover as próximas"); depois **Avisar o cliente no WhatsApp**. Para os próximos clientes, escolher "todo dia X" na proposta |
| "Não aparece Alterar vencimento" | Parcela já paga, sem data (use Definir vencimento) ou paga no cartão parcelado | No cartão, as datas seguem o cartão do cliente; para mudar, cancelar a cobrança no Asaas e gerar de novo |
| "O cliente não consegue aprovar a proposta" | Proposta expirada (passou da validade) | Nova versão, com validade nova |
| "O botão de enviar o contrato não funciona" | Falta algum dado que o contrato usa (aparece na lista em amarelo) | Preencher pelos atalhos, ou tirar do texto o campo que não se aplica |
| "Não consigo editar o contrato" | Contrato já enviado ao cliente | Cancelar (com senha) e gerar outro a partir da proposta |
| "O cliente não consegue assinar" | CPF/CNPJ com dígito errado, nome sem sobrenome ou endereço curto | Pedir para conferir os dados destacados na tela |
| "Registrei o pagamento errado" | O registro é definitivo | O Dono estorna (motivo + senha) e registra de novo |
| "Não consigo gerar o contrato" (limite de projetos) | 15 projetos em andamento no plano Profissional | Aprovar as etapas de projetos terminados, ou plano Escritório |
| "Não consigo enviar o briefing" (limite) | 15 briefings no mês no plano Briefing | Esperar o dia 1º ou mudar de plano |
| "O cliente pediu os dados dele" | Direito do titular (LGPD) | Ficha do cliente → Exportar dados do cliente |
| "O cliente não vê o botão de Pix" | O escritório não cadastrou a chave Pix, ou a parcela já foi paga | Configurações → Recebimento por Pix |
| "A parcela não tem data / não manda lembrete" | Parcela manual ou de contrato anterior aos vencimentos automáticos | Na parcela, "Definir vencimento" |
| "Diz que a conta Asaas está em análise" | O Asaas ainda não aprovou o cadastro (documentos e selfie) | Concluir o cadastro no app do Asaas e tentar de novo |
| "Não consigo gerar a cobrança" | Falta o CPF/CNPJ do cliente, ou a cobrança automática não está ativa | Completar a ficha do cliente; Configurações → Cobrança automática |
| "O Asaas não aceitou a chave" | Chave copiada errada, de outra conta, ou sem as permissões de cobrança | Gerar outra chave no Asaas (Integrações) e colar de novo |
| "Paguei e não baixou" (cliente) | O Asaas ainda não confirmou (boleto leva até 3 dias úteis) ou o pagamento foi por fora | Aguardar a confirmação, ou registrar à mão |
| "Não consigo excluir o cliente" | Tem contrato assinado ou pagamento registrado | Arquivar |
| "O cliente não consegue entrar no portal" | Não criou o acesso, ou esqueceu a senha | Mandar o link do projeto (o convite aparece nele); "Esqueci a senha" |
