# Ideias e ajustes do NorteArq

Escreva aqui o que lembrar, do jeito que vier (pode ditar). O assistente lê este arquivo no começo de
cada conversa, lembra o que está pendente, pergunta o que não estiver claro e move para "Feito" o que
for concluído. **Toda pendência entra aqui.**

Visão geral por fase (mapa): **NorteArq-Plano-de-fases.pdf**, na pasta "app - arquitetura"
(fonte em `docs/plano/plano-de-fases.html`; atualizado a cada fase concluída).

## Depende de você (Igor)
- [ ] **Empresa e conta central** (decidido em 03/10/2026): empresa **Berriel Labs Tecnologia Ltda.** (um nome
      para todos os SaaS; NorteArq é o primeiro produto), e-mail central **contas@berriellabs.com.br** dono de todas
      as contas. Passos, na ordem:
      1. Busca no INPI (busca.inpi.gov.br → Marca → Radical): "NorteArq", "Norte Arq" e "Berriel Labs", classes 42 e 9.
      2. ~~nortearq.com.br~~ feito em 03/10/2026 (HostGator, no CPF, vence em 10/2027; DNS no Cloudflare, ligado à
         Vercel). Falta, se quiser: berriellabs.com.br (e .com), livres em 03/10/2026.
      3. Criar contas@berriellabs.com.br (Cloudflare Email Routing para receber, grátis; Zoho Mail grátis para enviar),
         gerenciador de senhas (Bitwarden) e verificação em duas etapas em tudo.
      4. ~~Ligar o domínio~~ e ~~e-mails do sistema (Resend)~~ feitos em 03/10/2026.
      5. Começar a cobrar no **CPF** (decisão de 03/10/2026): conta do Asaas como pessoa física, carnê-leão todo mês
         (rendimentos até cerca de R$ 5 mil/mês são isentos desde 2026), planilha simples do que entrou. Termos e
         Privacidade com o seu nome e um e-mail de contato (sem expor o CPF). **Antes da primeira cobrança:**
         consulta avulsa com contador (cerca de R$ 100 a R$ 200) para confirmar a isenção, o INSS e o que fazer
         quando um escritório com CNPJ pedir nota ou descontar imposto na fonte.
      6. Abrir a ME (Berriel Labs Tecnologia Ltda., Sociedade Limitada Unipessoal, CNAE 6203-1/00, Simples
         Nacional com Fator R) quando a receita passar de ~R$ 5 mil/mês ou algum cliente exigir nota fiscal.
         MEI não serve: venda de software não é atividade permitida (o PLP 25/2026, que liberaria, ainda não é lei).
         Contador online costuma abrir de graça e cobrar R$ 100 a R$ 250/mês; e-CNPJ ~R$ 150 a R$ 250/ano.
      7. Pedido de marca no INPI (cerca de R$ 150 por classe com desconto; conferir a tabela).
- [ ] Ao cobrar o primeiro escritório de fora (antes da Fase 3): Supabase Pro (US$ 25/mês) e Vercel Pro
      (US$ 20/mês), juntos perto de R$ 260/mês. Até lá, tudo no plano grátis.
- [ ] Cancelar o convite que a Débora mandou para igorbritoberriel@gmail.com: seu e-mail já tem
      escritório, então esse convite nunca pode ser aceito (Configurações > Equipe, no escritório dela).
- [ ] Dados para os Termos e a Privacidade (eu coloco em `lib/legal.ts`): por enquanto o seu nome completo e um
      e-mail de contato (cobrança no CPF); quando a ME sair, razão social (Berriel Labs Tecnologia Ltda.) e CNPJ.
- [ ] Revisão por advogado: Termos de uso, Política de privacidade e o modelo de contrato padrão.

## Para conversar / decidir
- [ ] **Estratégia de lançamento** (decidida pelo Igor em 03/10/2026: não abrir agora). Proposta em 3 fases,
      aguardando aprovação dos detalhes:
      A) piloto fechado com a esposa até cumprir o "critério de pronto";
      B) 5 a 8 arquitetos patrocinados, 3 meses grátis com tudo liberado, em troca de uso real, conversa
         quinzenal, depoimento e divulgação (termo de parceria simples); no fim, preço de fundador travado;
      C) abertura ao mercado com os casos de sucesso.
      Para a fase B o sistema precisa de: conta patrocinada (90 dias, sem cobrança), botão "relatar
      problema ou sugestão", aviso automático de erros e um painel interno de uso.
- [ ] **Agente de parcerias (marketing do NorteArq)** (ideia do Igor, 03/10/2026), para a fase B:
      1) o assistente define os perfis ideais de arquiteto patrocinado e monta a lista de candidatos;
      2) um agente com todo o conhecimento do NorteArq conversa com cada um como o marketing da empresa,
         tira dúvidas, oferece a parceria de 3 meses e conduz até a assinatura do termo de parceria;
      3) o Igor acompanha as conversas e aprova cada parceria antes de fechar.
      A definir: canais (e-mail, Instagram, WhatsApp, LinkedIn), quanto o agente envia sozinho e quanto
      passa por aprovação, o texto do termo de parceria e como a assinatura acontece.
      Cuidados: Instagram e WhatsApp proíbem mensagens automáticas em massa (risco de bloqueio da conta);
      o primeiro contato deve ser personalizado e respeitar a LGPD (dado público e opção de não receber mais).
- [ ] **Preço de lançamento** (proposta de 03/10/2026, aguardando aprovação): piloto grátis da esposa em
      troca de depoimento; "Plano Fundador" R$ 47/mês com preço travado para os 30 primeiros; preço de
      tabela R$ 97 continua visível; Profissional com 2 pessoas; tirar o plano Briefing do lançamento.
- [ ] **Sugestões a partir do concorrente COP** (análise em `docs/concorrentes/cop.md`, 03/10/2026).
      Decidir quais entram: calculadora de honorários na proposta; "saúde do projeto"; dados de exemplo
      no teste grátis; cobrança do cliente por Pix/boleto; importar clientes de planilha; preço do
      Profissional com mais de 1 pessoa. Marketing: prova social, vídeo, SEO e calculadora gratuita.
- [ ] Analisar os outros concorrentes: Vobi, Projete.app, ARQPROJECT, ArqDesk, ProjetoList, Plana
      Software, escritorio.arq.br, Sole.
- [ ] Pessoa em vários escritórios com seletor (como no Slack) e "acesso de suporte" autorizado pelo
      dono: hoje uma conta = um escritório. Mudança grande.
- [ ] Assinatura digital com validade extra (ICP-Brasil): comparar ZapSign × Clicksign por envelope.
      Hoje o aceite é feito no próprio sistema, com data, hora, IP e código de verificação.
- [ ] Banco de imagens padrão do quiz: comprar licença ou usar fotos próprias/de parceiros (direitos autorais).
- [ ] Liberar a próxima etapa só depois do pagamento? (RN-01.17; hoje só avisa)
- [ ] Aprovação tácita depois de X dias sem resposta? (RN-03.7; sugestão: não na V1)

## A fazer
- [ ] Cópia de segurança, depois: (1) ensaio de restauração completa num projeto Supabase de teste, uma vez,
      para ter o passo a passo pronto; (2) LGPD: arquivos de cliente excluído/anonimizado continuam na cópia
      (pasta arquivos/ não expira): apagar também do R2 quando excluir ou anonimizar um cliente.
- [ ] **Controle fiscal automatizado da cobrança no CPF** (pedido do Igor, 03/10/2026; fazer junto com ele quando o
      primeiro escritório começar a pagar):
      1. **Relatório financeiro no painel interno** (só o Igor vê), alimentado pelo aviso de pagamento do Asaas que
         o sistema já recebe: quanto entrou por mês e por escritório, com taxas; botão para baixar a planilha do mês
         pronta para o Carnê-Leão; alerta quando a receita mensal se aproximar de ~R$ 5 mil (hora de abrir a ME).
      2. **Agente mensal** (rotina agendada do Claude Code, todo dia 1º): puxa os recebimentos do mês anterior, junta
         as despesas dos comprovantes numa pasta, calcula o que lançar no Carnê-Leão (isento ou valor da guia),
         guarda tudo no Google Drive (pasta por ano e mês, manter 5 anos) e manda o resumo ao Igor.
      3. **Fica com o Igor** (uns 5 minutos por mês): lançar no Carnê-Leão Web com o login gov.br e pagar a guia, se
         houver. Nos primeiros meses, conferir os números com o contador.
- [ ] **Manual completo do NorteArq** (aprovado em 03/10/2026). Fonte: `docs/manual/manual.md`, atualizada a
      cada entrega (regra no CLAUDE.md). Os 15 capítulos estão escritos, com 26 dúvidas no "Como resolver" e as
      perguntas frequentes do cliente final (03/10/2026). A central de ajuda (menu Ajuda) e as perguntas
      frequentes do cliente já leem o manual direto. Falta: gerar o PDF depois da conferência visual.
- [ ] **Revisão completa de UX/UI do sistema** (pedido do Igor, 03/10/2026). Lista pronta em
      `docs/revisao-ux.md`: 8 altas, 17 médias e 6 baixas, com sugestão e ordem para cada uma. Feitos: todos os itens.
      Falta ainda a conferência visual no navegador (prints).
- [ ] Botão "Concluir projeto" (marcar como entregue): hoje um projeto libera a vaga do limite quando todas
      as etapas são aprovadas; não existe como encerrar um projeto que parou no meio (cliente desistiu). Entra
      junto com o módulo 05, Pós-entrega.
- [ ] Adicional "+50 GB de espaço" (R$ 19/mês): somar ao limite do plano quando for contratado.
- [ ] Limite por arquivo de 200 MB quando o armazenamento do Supabase for pago (hoje 50 MB).

## Conferir na tela (feito e testado no banco, falta ver no navegador)
- [ ] E-mails: ~~teste chegou na caixa de entrada~~ (confirmado em 03/10/2026). Falta: Resend mostrar
      "Verified", testar "Esqueci a senha" e enviar uma etapa para aprovação para um e-mail seu.
- [ ] Instalar o NorteArq no celular (Android: "Instalar aplicativo" no menu; iPhone: Safari → Compartilhar →
      Adicionar à Tela de Início) e ver o ícone; ícone novo na aba do navegador.
- [ ] Domínio novo: entrar por https://nortearq.com.br, gerar um link de briefing e ver se sai com nortearq.com.br;
      testar "Esqueci a senha" (o e-mail deve trazer o link novo).
- [ ] Menu "Ajuda" (índice, busca, tabelas) e "Dúvidas frequentes" no fim de um link do cliente.
- [ ] Ficha do cliente → "Exportar dados do cliente": baixar e abrir o arquivo de um cliente de teste.
      Proposta enviada: "Salvar como modelo" embaixo da proposta.
- [ ] Lote 4 da revisão de UX: **menu no celular** (botão Menu, abre e fecha ao trocar de tela, sininho à vista);
      busca nas listas; "Reenviar o mesmo link" do briefing; confirmação ao enviar etapa; aviso de valor na
      observação do deslocamento.
- [ ] Lote 3 da revisão de UX: faixa "próximo passo" na ficha de clientes em fases diferentes; "Primeiros passos"
      no painel (num escritório novo); menu destacado; no link do cliente, "Falar com o escritório" e "Ver e
      responder" (também no celular).
- [ ] Proposta em rascunho: "Rascunho salvo às..." no rodapé, aviso ao sair com algo não salvo, erro no rodapé
      (ex.: apagar o valor total e clicar em "Revisar e enviar"), a janela da prévia no computador e no celular e
      "Salvar como modelo" no rodapé.
- [ ] Contrato em rascunho com dado do escritório faltando: caixa amarela com a lista e botão de enviar travado.
      Configurações: seção "Modelos e textos prontos".
- [ ] Logado no sistema: botão "Relatar problema ou sugestão" no menu (enviar um de teste) e o
      "Painel interno" (só aparece para o seu e-mail). O e-mail de aviso só sai com o Resend configurado.
- [ ] Sininho novo: número zera ao abrir, abas Não lidas/Todas, X para dispensar, Limpar lidas.
- [ ] Cliente repetido: aviso ao cadastrar, "cadastrar mesmo assim" e "Juntar com este" na ficha.
- [ ] Sistema logado como Administrador e como Colaborador (menu e telas de cada perfil).
- [ ] Primeiro e-mail real de lembrete de etapa parada (3 e 7 dias): ainda não houve etapa esperando.
- [ ] Miniaturas dos arquivos antigos da Débora: são geradas quando ela abrir o projeto.

## Validar com arquitetos (já funciona; confirmar se a regra está boa)
- [ ] Preços e limites dos planos; se o plano Briefing (R$ 49) vale a pena existir.
- [ ] Teste grátis de 14 dias, modo leitura de 30 dias, tolerância de 7 dias no atraso.
- [ ] Filtro de compatibilidade, validade de 15 dias da proposta, link do briefing de 30 dias.
- [ ] Quiz com no mínimo 12 imagens; fotos de referência até 20 de 10 MB.
- [ ] Briefing detalhado depois do contrato (padrão).
- [ ] Antes do lançamento: entrevistar 5 a 10 arquitetos e chegar a 50 inscritos na lista de espera.

## Ideias para depois
- [ ] Fase 2 dos arquivos: cliente marca um ponto na imagem e comenta (conta como revisão);
      comparar Rev01 × Rev02 lado a lado.
- [ ] Módulo 04, Acompanhamento de obra (a tela "Obras" ainda está em construção).
- [ ] Módulo 05, Pós-entrega: avaliação, depoimento, arquivamento, lembrete de 6 meses.
- [ ] WhatsApp automático (API oficial, paga) no lugar do botão de enviar.
- [ ] Módulo 06, Adicionais: página do arquiteto, IA, loja de modelos, rede de indicação.

## Feito
- [x] Cópia de segurança diária grátis (03/10/2026): GitHub Actions todo dia às 03:00 (Brasília) copia para o Cloudflare R2 (balde nortearq-backup) o banco completo (pg_dump) + só os dados com os logins (guarda 30 dias) e os arquivos novos do Storage (incremental). E-mail para o Igor se falhar. Testada: 53 arquivos (14 MB) e as 35 tabelas conferidas linha por linha com o banco. A rotina também mantém o Supabase grátis acordado. Senha do banco gerada só para isso (no .env.local e nos segredos do GitHub).
- [x] E-mails funcionando (03/10/2026): Resend com o domínio nortearq.com.br (região São Paulo, registros DKIM e de envio colocados no Cloudflare automaticamente); avisos do sistema saem de "NorteArq <avisos@nortearq.com.br>"; e-mails de login do Supabase (esqueci a senha, confirmação) também pelo Resend, limite de 30 por hora. E-mail de teste enviado para agenciaberrielmkt@gmail.com. Plano grátis: 3.000 e-mails/mês, 100/dia.
- [x] Rotinas automáticas ligadas (03/10/2026): faltava o CRON_SECRET na Vercel, e os lembretes de etapa (3 e 7 dias), o fim do teste grátis e a limpeza de notificações nunca tinham rodado. Chave criada e sistema publicado de novo. Ainda faltam na Vercel só as chaves do Asaas (cobrança, quando for cobrar).
- [x] Favicon e aplicativo instalável (03/10/2026): ícone do NorteArq (avatar dourado sobre azul) na aba, no iPhone e no Android; botão "Instalar aplicativo" no menu do arquiteto (no iPhone, passo a passo); páginas do cliente final usam a logo do escritório na aba.
- [x] Domínio próprio no ar (03/10/2026): **nortearq.com.br** registrado na HostGator, DNS no Cloudflare (conta agenciaberrielmkt@gmail.com, junto com o outro SaaS), domínio na Vercel com cadeado, www redireciona, endereço oficial do sistema e do Supabase trocados para https://nortearq.com.br. Links antigos (nortearq.vercel.app) continuam funcionando. Chave da Vercel no .env.local vence em 30 dias.
- [x] Corrigido "Nova proposta" e "aplicar modelo" que falhavam para todo cliente desde a migração de duplicidade (duas ligações entre clientes e pedidos de orçamento) e o texto ilegível do aviso flutuante de notificação (03/10/2026, achados pelos prints).
- [x] Opção do momento do briefing passou a valer (03/10/2026): "antes da proposta" faz a ficha do cliente sugerir o briefing (e esperar a resposta) antes de montar a proposta; "depois do contrato" sugere o briefing quando o contrato é assinado.
- [x] Central de ajuda (03/10/2026): menu "Ajuda" com o manual, índice e busca; "Dúvidas frequentes" no fim das páginas do cliente (links e portal). Tudo lido de docs/manual/manual.md; trechos só de suporte ficam de fora.
- [x] Lote 5 (03/10/2026): exportar dados do cliente (LGPD); limites dos planos travados no banco (15 briefings/mês no Briefing, 15 projetos em andamento no Profissional, migração 0036) com aviso no painel; "Salvar como modelo" também em propostas enviadas e aprovadas.
- [x] Revisão de UX, lote 4 (03/10/2026): menu recolhido no celular; reenviar o mesmo link do briefing; confirmação ao enviar etapa, excluir pedido e conceder cortesia; erros visíveis em Virar cliente, Nova proposta, Gerar contrato e Nova versão; explicação do deslocamento com aviso de valor na observação; busca pelo nome do cliente em Propostas, Projetos, Contratos e Briefings; linha do tempo com propostas e etapas.
- [x] Revisão de UX, lote 3 (03/10/2026): próximo passo e seção Projeto na ficha do cliente; Perfil do Cliente no projeto; pedido de revisão do cliente no topo da etapa; "visível ao cliente" antes do envio de arquivos; "Falar com o escritório" e "Ver e responder" para o cliente; primeiros passos no painel; menu com a tela atual destacada e sem "Obras"; ações perigosas por último na ficha.
- [x] Revisão de UX, proposta (03/10/2026): salvamento automático e aviso ao sair; erro no rodapé com rolagem até o campo; "Revisar e enviar" mostra a proposta como o cliente vê antes de enviar; "Salvar como modelo" no rodapé.
- [x] Revisão de UX, primeiros ajustes (03/10/2026): contrato não sai mais com "[a preencher]" (lista do que falta e envio travado, também no banco, migração 0035); "Apagar rascunho" pede confirmação; Configurações com atalhos para os modelos no lugar da lista "Em breve".
- [x] Aviso automático de erros (servidor e telas, com repetições juntadas), telas de erro em português, botão "Relatar problema ou sugestão" e painel interno /app/interno (03/10/2026).
- [x] Permissões: matriz única (Dono, Administrador, Colaborador) no código, nas telas e no banco; documentada na especificação (03/10/2026).
- [x] Duplicidade: equipe, CPF/CNPJ, aviso de cliente parecido, juntar clientes, reenvio do formulário, nomes repetidos (03/10/2026).
- [x] Notificações: zera ao abrir, lida ao abrir o item, abas Não lidas/Todas, dispensar, limpeza 30/90 dias, leitura por pessoa, grupos (03/10/2026).
- [x] Arquivos do projeto: miniaturas, visualizador, renders, capa e espaço do plano (03/10/2026).
- [x] Termos de uso e política de privacidade completa; aceite registrado no cadastro (03/10/2026).
- [x] Lembretes de etapa parada há 3 e 7 dias; aviso de limite de revisões para os dois lados (03/10/2026).
