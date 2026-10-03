# Ideias e ajustes do NorteArq

Escreva aqui o que lembrar, do jeito que vier (pode ditar). O assistente lê este arquivo no começo de
cada conversa, lembra o que está pendente, pergunta o que não estiver claro e move para "Feito" o que
for concluído. **Toda pendência entra aqui.**

Visão geral por fase (mapa): **NorteArq-Plano-de-fases.pdf**, na pasta "app - arquitetura"
(fonte em `docs/plano/plano-de-fases.html`; atualizado a cada fase concluída).

## Depende de você (Igor)
- [ ] **Urgente antes do piloto:** conferir na Vercel se `RESEND_API_KEY` e `EMAIL_REMETENTE` estão
      configurados e verificar um domínio próprio no Resend. Sem isso nenhum e-mail chega ao cliente
      final (etapa enviada, lembretes, contrato, limite de revisões). No meu computador a chave não existe.
- [ ] **Urgente antes do piloto:** passar o Supabase para o plano Pro (US$ 25/mês) por causa das
      cópias de segurança diárias: com clientes reais, o plano grátis não tem backup.
- [ ] Registrar o domínio (ex.: nortearq.com.br) e apontar para a Vercel: link "nortearq.vercel.app"
      no WhatsApp do cliente passa pouca confiança.
- [ ] Ao cobrar o primeiro escritório de fora: Vercel Pro (US$ 20/mês; o plano grátis não permite uso comercial).
- [ ] Cancelar o convite que a Débora mandou para igorbritoberriel@gmail.com: seu e-mail já tem
      escritório, então esse convite nunca pode ser aceito (Configurações > Equipe, no escritório dela).
- [ ] Dados da empresa para os Termos e a Privacidade: razão social, CNPJ e e-mail de contato
      (eu coloco em `lib/legal.ts`).
- [ ] Revisão por advogado: Termos de uso, Política de privacidade e o modelo de contrato padrão.
- [ ] Busca no INPI pelo nome "NorteArq" (classes 42 e 9); plano B: RumoArq.
- [ ] Ícone da aba do navegador (favicon): dizer se uso o logo atual do NorteArq.

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
- [ ] **Manual completo do NorteArq** (aprovado em 03/10/2026). Fonte: `docs/manual/manual.md`, atualizada a
      cada entrega (regra no CLAUDE.md). Os 15 capítulos estão escritos, com 26 dúvidas no "Como resolver" e as
      perguntas frequentes do cliente final (03/10/2026). Falta: gerar o PDF depois da revisão de UX e levar a
      versão curta para uma central de ajuda dentro do sistema.
- [ ] **A opção "Quando o cliente responde o briefing detalhado?" não faz nada** (achado ao escrever o manual,
      03/10/2026). Ela é salva nas Configurações e no passo 4 da configuração inicial, mas o sistema não usa a
      escolha: o link de briefing pode ser mandado a qualquer momento pela ficha do cliente. Decidir: tirar a
      opção, ou fazer ela valer (ex.: "Antes da proposta" sugere enviar o briefing ao virar cliente; "Depois do
      contrato" mostra o envio do briefing como próximo passo no projeto recém-criado).
- [ ] **Revisão completa de UX/UI do sistema** (pedido do Igor, 03/10/2026). Lista pronta em
      `docs/revisao-ux.md`: 8 altas, 17 médias e 6 baixas, com sugestão e ordem para cada uma. Feitos: todas as altas (A1 a A8)
      e M15. Próximos: M1 a M3 (ligar ficha, contrato e projeto) e M10 (primeiros passos).
      Falta ainda a conferência visual no navegador (prints).
- [ ] Exportar os dados de um cliente quando ele pedir (LGPD, RG-9): hoje dá para arquivar, excluir,
      anonimizar e juntar, mas não exportar.
- [ ] Limites dos planos no banco: 15 briefings por mês (plano Briefing) e 15 projetos ativos
      (Profissional). Hoje só o espaço de arquivos e as vagas da equipe são travados.
- [ ] Adicional "+50 GB de espaço" (R$ 19/mês): somar ao limite do plano quando for contratado.
- [ ] Limite por arquivo de 200 MB quando o armazenamento do Supabase for pago (hoje 50 MB).

## Conferir na tela (feito e testado no banco, falta ver no navegador)
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
- [x] Revisão de UX, proposta (03/10/2026): salvamento automático e aviso ao sair; erro no rodapé com rolagem até o campo; "Revisar e enviar" mostra a proposta como o cliente vê antes de enviar; "Salvar como modelo" no rodapé.
- [x] Revisão de UX, primeiros ajustes (03/10/2026): contrato não sai mais com "[a preencher]" (lista do que falta e envio travado, também no banco, migração 0035); "Apagar rascunho" pede confirmação; Configurações com atalhos para os modelos no lugar da lista "Em breve".
- [x] Aviso automático de erros (servidor e telas, com repetições juntadas), telas de erro em português, botão "Relatar problema ou sugestão" e painel interno /app/interno (03/10/2026).
- [x] Permissões: matriz única (Dono, Administrador, Colaborador) no código, nas telas e no banco; documentada na especificação (03/10/2026).
- [x] Duplicidade: equipe, CPF/CNPJ, aviso de cliente parecido, juntar clientes, reenvio do formulário, nomes repetidos (03/10/2026).
- [x] Notificações: zera ao abrir, lida ao abrir o item, abas Não lidas/Todas, dispensar, limpeza 30/90 dias, leitura por pessoa, grupos (03/10/2026).
- [x] Arquivos do projeto: miniaturas, visualizador, renders, capa e espaço do plano (03/10/2026).
- [x] Termos de uso e política de privacidade completa; aceite registrado no cadastro (03/10/2026).
- [x] Lembretes de etapa parada há 3 e 7 dias; aviso de limite de revisões para os dois lados (03/10/2026).
