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
- [ ] Asaas: concluir a aprovação dos documentos e da conta bancária no painel do Asaas (necessário para sacar).
      Antes da 1ª cobrança real: testar uma assinatura de ponta a ponta (dá para usar um escritório de teste e
      estornar).
- [ ] **Nível 3, achado de 04/10/2026:** conta principal no CPF **não cria subcontas** no Asaas (exige CNPJ). Dois
      caminhos: (a) sem CNPJ: o arquiteto abre a própria conta Asaas e conecta ao NorteArq com a chave dele (sem
      permissão de saque), e cada cobrança leva o split para a carteira do NorteArq; (b) com CNPJ (ME Berriel Labs):
      subcontas criadas pelo NorteArq, cadastro mais simples para o arquiteto. Começar por (a) e migrar para (b)
      quando abrir a ME.
- [ ] Cobrança automática, pendências: (1) Igor mandar o link de indicação do Asaas (menu → Indicar amigo) para eu
      colocar em NEXT_PUBLIC_ASAAS_INDICACAO; (2) primeiro teste real com dinheiro (uma parcela pequena paga por Pix
      numa conta Asaas de arquiteto de verdade, para ver o split de R$ 0,99 cair na conta do NorteArq); (3) página
      pública "Tarifas" no site; (4) quando abrir a ME, migrar para subcontas (cadastro do arquiteto dentro do NorteArq).
- [ ] Débora: acrescentar no modelo de contrato dela a cláusula de multa de 2% e juros de 1% ao mês (os modelos
      existentes não mudam sozinhos) e cadastrar a chave Pix em Configurações.
- [ ] **Piloto com a Débora: lista de tarefas** (sem prazo; decisão do Igor em 03/10/2026: acabando as tarefas,
      seguimos para os arquitetos parceiros). Clientes reais: o que está em andamento e o Luiz Cláudio.
      Teste completo pelo Igor, no escritório de teste dele (igorbritoberriel@gmail.com), fazendo o papel do cliente
      com outro e-mail (eu passo o roteiro clique a clique):
      - [ ] 1. Pedido de orçamento pelo formulário (celular)
      - [ ] 2. Virar cliente e montar a proposta; salvar como modelo
      - [ ] 3. Cliente aprova a proposta pelo link (celular)
      - [ ] 4. Gerar o contrato e o cliente assinar (celular); convite do portal
      - [ ] 5. Briefing com o quiz de estilo respondido pelo cliente; Perfil do Cliente
      - [ ] 6. Etapa com arquivo enviada; e-mail chega ao cliente; cliente pede revisão
      - [ ] 7. Reenviar a etapa e o cliente aprovar
      - [ ] 8. Aditivo criado e respondido pelo cliente; pagamento registrado e recibo
      - [ ] 9. "Esqueci a senha" (e-mail chega e funciona)
      Débora:
      - [ ] 10. Link novo do formulário na bio e no WhatsApp; app instalado no celular; ~~primeiro modelo de proposta~~
            (feito em 04/10/2026); chave Pix em Configurações; cláusula de multa no modelo de contrato dela
      - [ ] 11. Os 2 clientes reais andando sem erro que trave (atritos pelo "Relatar problema")
      Eu:
      - [ ] 12. Painel interno sem erro grave pendente e tudo que aparecer corrigido
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
- [ ] Adicional "+50 GB de espaço" (R$ 19/mês): somar ao limite do plano quando for contratado.
- [ ] Limite por arquivo de 200 MB quando o armazenamento do Supabase for pago (hoje 50 MB).

## Conferir na tela (feito e testado no banco, falta ver no navegador)
- [ ] **Fornecedores e entradas:** conferido no site em 09/10 (computador e celular): cadastro, arquivar e lista.
      Falta: escolha e cadastro rápido de fornecedor dentro de Nova entrada e Nova despesa, e a máscara de dinheiro.
- [x] **Situação e prazos (09/10):** conferido no site, computador e celular: prazo da etapa, pausar e retomar.
      Migração 0047 aplicada nesse dia (estava publicada no código sem estar no banco).
- [ ] **Nova tela Início:** prévia em `/preview-inicio` (somente desenvolvimento) aguardando sua aprovação.
- [ ] **Situação e prazos de projetos:** conferir computador e celular, pausa com motivo, encerramento,
      reabertura, histórico e edição da data; conferir agenda e visão do cliente em projeto pausado.
- [ ] **Financeiro:** conferir computador e celular, abas, busca, seletor de mês, cadastro e pagamento de
      despesa, cancelamento com motivo e recebimento manual com recibo; conferir conta Asaas conectada e
      desconectada. A prévia local está em `/preview-financeiro` (somente desenvolvimento).
Conferência automática de 04/10/2026 (conta de teste, computador e celular, 23 telas): painel, menu do celular,
ficha com "próximo passo", proposta em rascunho, contrato, projeto, configurações, formulário do escritório e as
páginas do cliente (proposta, contrato, projeto, briefing, dúvidas frequentes) sem erros; 3 desalinhamentos
corrigidos. Ficam para olhar com uso real os itens abaixo.
- [ ] E-mails: ~~teste chegou na caixa de entrada~~ (confirmado em 03/10/2026). Falta: Resend mostrar
      "Verified", testar "Esqueci a senha" e enviar uma etapa para aprovação para um e-mail seu.
- [ ] Instalar o NorteArq no celular (Android: "Instalar aplicativo" no menu; iPhone: Safari → Compartilhar →
      Adicionar à Tela de Início) e ver o ícone; ícone novo na aba do navegador.
- [ ] Domínio novo: entrar por https://nortearq.com.br, gerar um link de briefing e ver se sai com nortearq.com.br;
      testar "Esqueci a senha" (o e-mail deve trazer o link novo).
- [ ] Ficha do cliente → "Exportar dados do cliente": baixar e abrir o arquivo de um cliente de teste.
      Proposta enviada: "Salvar como modelo" embaixo da proposta.
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
- [x] **Fornecedores e outras entradas do financeiro** (08/10/2026): cadastro de fornecedores e parceiros
      (busca, segmento, arquivar, excluir só se nunca usado), escolha do fornecedor em entradas e despesas com
      cadastro rápido, nome gravado como retrato no lançamento. Entradas fora de contrato (RT, aporte, reembolso)
      com cancelamento por motivo e histórico. Migrações 0048 e 0049 aplicadas no banco; 0042 corrige o pedido
      de orçamento repetido. Máscara de dinheiro aceita ponto decimal e completa os centavos ao sair do campo.
- [x] **Situação e prazos de projetos** (07/10/2026): pausar, retomar, concluir entrega, encerrar e reabrir
      com histórico; bloqueio do trabalho em projetos inativos; pagamentos preservados; prazos por etapa,
      agenda de atrasos e próximos sete dias e filtros por situação. Migração 0047 com testes em transação
      desfeita: permissões, isolamento entre escritórios, limite do plano e respostas do cliente.
- [x] **Financeiro do escritório (07/10/2026):** migração `0046_financeiro_despesas.sql` aplicada e aplicação
      publicada em nortearq.com.br. Visão geral, parcelas a receber, despesas e consulta de saldo Asaas;
      pendências permanecem visíveis entre meses, pagamentos manuais exibem a forma registrada e despesas
      usam a máscara de dinheiro do sistema. Build, TypeScript, cálculos e testes de RLS/histórico passaram.
      Verificado no site com conta temporária: página autenticada, despesa visível, bloqueio do Colaborador e
      prévia inacessível em produção. Conta e escritório de teste removidos. Manual e especificação atualizados.
      Conferência visual em computador e celular continua na lista acima.
- [x] Conta Asaas de teste no site real (04/10/2026): a Débora conectou uma chave do ambiente de testes (sandbox, $aact_hmlg) e aparecia "conta de teste". Agora o site real recusa chave de teste com o passo a passo da chave certa, não gera cobrança com conta de teste já conectada (o cliente continua vendo o Pix) e mostra aviso com os passos para trocar. Nenhuma cobrança de teste chegou aos clientes dela.
- [x] Máscara na chave Pix (04/10/2026): o campo segue o tipo escolhido (CPF 000.000.000-00, CNPJ 00.000.000/0000-00, celular (11) 91234-5678, e-mail com teclado de e-mail, chave aleatória com exemplo); trocar o tipo limpa o campo.
- [x] "Salvar Pix" dava erro em Configurações (04/10/2026, migração 0041): a 0037 criou os campos do Pix sem liberar a gravação. Agora grava pela função salvar_pix, só para o dono (a chave decide para onde vai o dinheiro). Pix fixo e cobrança automática convivem: parcela com cobrança do Asaas mostra "Pagar agora (Pix, boleto ou cartão)"; as outras mostram "Pagar com Pix". Login: uma falha momentânea do banco não manda mais o arquiteto para o portal do cliente. Telas de como o cliente paga em "referencias do projeto/asaas-como-o-cliente-ve".
- [x] Renders do projeto com espaço próprio (04/10/2026, migração 0040): a arquiteta adiciona e exclui renders direto no projeto (até 12 imagens), fora das etapas e sem aprovação; o cliente já vê, abre e baixa. Numa linha com setas, abaixo do link do cliente (no topo para o cliente). Capa = estrela ou primeiro render. Nas etapas, o tipo "Render 3D" saiu (Prancha técnica, Documento, Outro); os arquivos de etapa que estavam como render viraram prancha ou outro (o "LAYOUT PLANTA HUMANIZADA" da Débora virou prancha). Substitui o "destaque" da migração 0039. Testado de ponta a ponta, inclusive o limite de 12 (escritório de teste e arquivos apagados depois).
- [x] Renders em destaque (04/10/2026, migração 0039): o mural "Renders do projeto" mostra só os renders que a arquiteta destaca (botão Destacar no arquivo, até 12), numa linha com setas, abrindo no visualizador, com o botão "Escolher renders" no próprio mural (seletor com as imagens Render 3D do projeto); fica abaixo do link do cliente para ela e no topo para o cliente. Capa = estrela ou primeiro destaque; sem destaque, sem capa (saíram as iniciais "PA" do projeto e a letra da lista de projetos). Imagem com "planta", "layout", "corte", "humanizada" no nome entra como Prancha técnica. Testado de ponta a ponta com escritório de teste (apagado depois, com os arquivos).
- [x] Reels do @usenortearq (04/10/2026): 3 vídeos verticais de 15 s (cliente responde sozinho, revisões contadas, Perfil do Cliente pronto), visual da landing, telas reais de um escritório de demonstração (apagado depois), com capas e legendas em "referencias do projeto/reels". Fontes para refazer em scripts/demo-landing/reels.
- [x] Link do formulário repetido em Configurações (04/10/2026): o cartão "Link do seu formulário" é o lugar de copiar e enviar; em Minha marca, o endereço ficou recolhido em "Mudar o endereço do formulário", com aviso de que o link antigo para de funcionar. No assistente de primeiro acesso continua aberto.
- [x] Endereço do formulário cortado no celular (04/10/2026): em Configurações > Minha marca, o prefixo "nortearq.com.br/e/" passa para cima e o endereço aparece inteiro; a linha de logo e cor também não passa mais da largura da tela em celulares pequenos (360 px).
- [x] Landing page nova, visual "escuro premium" (04/10/2026): escolhida entre duas propostas em imagem (referencias do projeto/landing-mockups). Topo azul-noite com grade de planta técnica e dourado, vídeo de 21 s do sistema em uso (painel, Perfil do Cliente, projeto; 800 KB, com botão de pausar) e celulares flutuando com as telas do cliente se revezando, dores, como funciona, números, mosaico de recursos, planos e dúvidas em área clara, lista de espera. Movimento sutil e desligado para quem pede menos movimento. Topo e rodapé novos também em Preços, Termos e Privacidade. Vídeo e prints gravados com escritório de demonstração (apagado depois); scripts em scripts/demo-landing.
- [x] Conferência visual automática (04/10/2026): navegador automático com escritório de teste (apagado depois) em 23 telas, no computador e no celular, sem erros de tela; corrigidos os pagamentos desalinhados (arquiteto e cliente) e as opções de parcelamento da proposta.
- [x] Convite para ativar a cobrança automática dentro do sistema (04/10/2026): faixa nos pagamentos do contrato, item nos Primeiros passos (Pix ou cobrança) e mensagem amigável quando a conta Asaas ainda está em análise. Não precisa mandar e-mail aos arquitetos.
- [x] Cobrança automática pelo Asaas do arquiteto, nível 3 (04/10/2026, migração 0038): conexão da conta Asaas do escritório (chave criptografada, sem saque), cobrança por parcela (Pix, boleto ou cartão, o cliente escolhe) com split de R$ 0,99 para a carteira do NorteArq, baixa automática com recibo e aviso ao arquiteto, extrato com líquido e tarifas, link no projeto/portal/lembrete, geração automática das parcelas que vencem em 10 dias, Termos e site atualizados. Testada de ponta a ponta com a conta de teste do Asaas (escritório de teste apagado depois).
- [x] Asaas de produção ligado para a assinatura do NorteArq (04/10/2026): conta no CPF do Igor (agenciaberrielmkt@gmail.com; dados comerciais aprovados, documentos e conta bancária pendentes de aprovação), chave de produção sem permissão de saque, webhook criado por API (https://nortearq.com.br/api/asaas/webhook, eventos de pagamento confirmado, recebido, vencido e estornado) e testado (sem senha 401, com senha 200). Vercel com ASAAS_API_KEY, ASAAS_AMBIENTE=producao e ASAAS_WEBHOOK_TOKEN. No computador, a ASAAS_API_KEY continua a de teste (sandbox).
- [x] Aba aberta durante uma publicação nova (04/10/2026): em vez da tela "Algo deu errado", o sistema recarrega sozinho uma vez, já na versão nova, e não registra como erro. Eram os 3 erros automáticos de 03/10 (marcados como resolvidos). Primeira cópia de segurança automática da madrugada: sucesso.
- [x] "O pagamento não passa pelo NorteArq" explicado (04/10/2026): pergunta frequente no site, cláusula nos Termos de uso (seção 6; revisar com o advogado) e linha na Ajuda.
- [x] Proteção do recebimento do arquiteto (04/10/2026, migração 0037): vencimento automático das parcelas novas (e "Definir vencimento" nas sem data), parcela atrasada em vermelho e total "em atraso" no painel, lembretes por e-mail ao cliente (3 dias antes, no dia, 3 dias depois) e aviso de atraso no sininho, chave Pix do escritório com "Pagar com Pix" (QR Code + copia e cola) para o cliente e "Cobrar no WhatsApp" com o Pix, cláusula de multa 2% + juros 1% a.m. no contrato padrão (modelos novos).
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

- [ ] CNPJ alfanumérico (revisão de 07/10/2026): adaptar máscaras, validação, normalização SQL de assinar_contrato e integrações Asaas/Pix. O formato atual suporta CPF e CNPJ numéricos. Referência: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-gera-o-primeiro-cnpj-em-formato-alfanumerico
- [x] Revisão de máscaras (07/10/2026): dinheiro em orçamento, configurações, propostas, parcelas, deslocamento, modelos e aditivos; leitura decimal comum no servidor; CPF/CNPJ numéricos com dígitos verificadores; datas de calendário e exibição em Brasília. Teste: node scripts/test-formatacao.mjs. Backup: .backups/antes-revisao-mascaras-20261007.zip.
