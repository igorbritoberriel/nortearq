# Revisão de UX/UI do NorteArq

Feita em 03/10/2026, lendo tela por tela o que o sistema faz hoje (arquiteto e cliente final).
Nada foi alterado: cada item espera a sua aprovação. Ainda falta ver no navegador o lado visual (espaçamento,
cores, tamanho de letra e o celular de verdade). Essa parte entra depois, com prints.

Prioridade: **Alta** = pode causar erro com cliente real ou travar o piloto · **Média** = atrapalha o dia a dia ·
**Baixa** = acabamento.

---

## Alta

**A1. Contrato pode ser enviado com "[a preencher]" no texto.** ✅ Feito (03/10/2026).
Se faltam CPF/CNPJ, endereço ou responsável do escritório, a tela só mostra um aviso, e o botão de enviar
funciona mesmo assim. O cliente recebe e assina um contrato com lacunas.
→ Bloquear o envio enquanto houver "[a preencher]" no texto, com o link "Preencher agora".

**A2. Proposta: a mensagem de erro aparece no topo, longe dos botões.**  ✅ Feito (03/10/2026).
Os botões "Salvar rascunho" e "Enviar no WhatsApp" ficam no fim de um formulário longo, mas o erro
("Confira os campos destacados", "A soma das parcelas...") aparece lá em cima. Quem clica em Enviar não vê
nada acontecer.
→ Mostrar a mensagem junto dos botões e rolar até o primeiro campo com erro.

**A3. Proposta: sair da página perde tudo o que não foi salvo.**  ✅ Feito (03/10/2026): salvamento automático e aviso ao sair.
Não há salvamento automático nem aviso ao fechar a aba ou clicar no menu. O mesmo vale para o texto do
contrato em rascunho.
→ Aviso "Você tem alterações não salvas" ao sair e, se possível, salvamento automático como no briefing.

**A4. Proposta: dá para enviar sem ver como o cliente vai ler.**  ✅ Feito (03/10/2026): "Revisar e enviar".
O envio é definitivo (depois só com nova versão), mas não existe uma prévia. Só o deslocamento tem o
"Como o cliente vai ler".
→ Botão "Ver como o cliente vê" antes de enviar, abrindo a mesma visualização do link.

**A5. "Apagar rascunho" apaga na hora, sem confirmar.** ✅ Feito (03/10/2026).
Um clique e a proposta inteira some.
→ Pedir confirmação ("Apagar este rascunho? Não dá para desfazer.").

**A6. O painel inicial esquece pedidos de orçamento que já foram vistos.**  ✅ Feito (03/10/2026).
O cartão "pedidos de orçamento novos" só conta os não vistos. Basta abrir a lista de Contatos uma vez para o
pedido sumir do painel, mesmo sem resposta. Um cliente compatível pode ficar esquecido.
→ Contar os pedidos em aberto (compatíveis e a avaliar) que ainda não viraram cliente nem foram encerrados,
e destacar os que estão parados há mais de 2 dias.

**A7. O painel não mostra "proposta aprovada, falta gerar o contrato".**  ✅ Feito (03/10/2026).
Esse é o momento em que o cliente está mais quente, e não aparece em "Precisa de você". Também não aparecem:
revisão além do limite esperando a decisão (cortesia ou aditivo) e cliente novo ainda sem proposta.
→ Incluir esses três cartões.

**A8. Configurações anuncia como "Em breve" coisas que já existem.** ✅ Feito (03/10/2026).
A lista "Em breve nesta tela" mostra "Modelo de contrato" e "Plano e pagamento da assinatura", que já
funcionam (em Contratos → Modelos e em Plano e assinatura). Quem procura o modelo de contrato acha que ainda
não existe.
→ Tirar a lista e pôr atalhos: Modelos de contrato, Modelos de proposta, Editor de briefing, Plano e assinatura.

---

## Média

**M1. A ficha do cliente não leva ao projeto.** ✅ Feito (03/10/2026).
A ficha mostra Briefing, Proposta e Contrato, mas não o Projeto. Para chegar, é preciso ir ao menu Projetos.
→ Linha "Projeto" na ficha, com etapas aprovadas e o link.

**M2. O projeto não leva ao briefing (Perfil do Cliente).** ✅ Feito (03/10/2026).
É o que o arquiteto mais consulta enquanto projeta.
→ Link "Perfil do Cliente" no topo do projeto, ao lado de Cliente e Contrato.

**M3. A ficha do cliente não diz qual é o próximo passo.** ✅ Feito (03/10/2026).
O selo mostra a etapa (Proposta, Contrato...), mas não o que fazer agora.
→ Uma linha de destaque: "Próximo passo: gerar o contrato" / "enviar o briefing" / "aguardando o cliente
assinar", com o botão certo.

**M4. Na ficha, só dá para gerar um link novo, nunca reenviar o mesmo.** ✅ Feito (03/10/2026).
Para mandar de novo um link que o cliente perdeu, o arquiteto precisa gerar outro, e o anterior para de
funcionar. Se o cliente abrir a mensagem antiga, vê "Este link não vale mais".
→ "Copiar o link atual" quando ele ainda vale; "Gerar novo" só quando necessário.

**M5. Etapa do projeto: o "Visível ao cliente" fica depois do botão de enviar arquivos.** ✅ Feito (03/10/2026).
A escolha vale para os próximos envios, mas está posicionada como se fosse para o arquivo que acabou de subir.
→ Pôr a opção antes do botão ("Os próximos arquivos vão: visíveis ao cliente / só para o escritório").

**M6. Pedido de revisão do cliente fica escondido no histórico da etapa.** ✅ Feito (03/10/2026).
Quando a etapa está "em revisão", o comentário do cliente aparece no fim, no histórico.
→ Caixa em destaque no topo da etapa: "O cliente pediu: ...".

**M7. Enviar a etapa para aprovação não confirma o que vai.** ✅ Feito (03/10/2026).
Arquivos enviados ficam travados e o cliente recebe e-mail na hora.
→ Confirmação curta: "Vai enviar 3 arquivos visíveis. O cliente recebe por WhatsApp e e-mail."

**M8. Cliente final: o aviso "etapa esperando a sua aprovação" não leva até ela.** ✅ Feito (03/10/2026).
No celular, com muitos arquivos, ele precisa rolar até achar o botão. Aditivo esperando resposta nem entra no
aviso.
→ Botão "Ver e responder" que leva direto, e o aditivo pendente no mesmo aviso.

**M9. Cliente final não tem como falar com o escritório pelo projeto.** ✅ Feito (03/10/2026).
O botão de WhatsApp do escritório só aparece quando o link venceu ou a proposta expirou.
→ "Falar com o escritório" fixo no topo ou no rodapé das páginas do cliente.

**M10. Primeiro uso: o painel diz "Tudo em dia" para quem ainda não fez nada.** ✅ Feito (03/10/2026).
Para os arquitetos patrocinados (fase B), falta um guia dos primeiros passos.
→ Lista "Primeiros passos" até ser concluída: dados do escritório no contrato, um modelo de proposta,
testar o próprio formulário, cadastrar o primeiro cliente, enviar o primeiro briefing.

**M11. Celular: o menu do sistema empurra o conteúdo para baixo.** ✅ Feito (03/10/2026).
Abaixo de 860 px, o menu lateral inteiro (logo, escritório, sininho, 10 itens, relatar problema e usuário)
fica em cima de toda página.
→ Barra compacta no topo com botão de menu, e o sininho sempre visível.

**M12. O menu não mostra em que tela a pessoa está.** ✅ Feito (03/10/2026).
Nenhum item fica destacado.
→ Destacar o item atual.

**M13. "Obras" aparece no menu, mas a tela está em construção.** ✅ Feito (03/10/2026).
Para quem testa, parece coisa quebrada.
→ Esconder até o módulo 04 existir, ou mostrar com o selo "Em breve".

**M14. Algumas ações falham em silêncio.** ✅ Feito (03/10/2026).
"Virar cliente", "Nova proposta", "Gerar contrato" e "Criar nova versão" não mostram nada se der erro: o
botão simplesmente não faz nada.
→ Mensagem de erro em cada uma.

**M15. Proposta: "Salvar como modelo" fica escondido embaixo** (já anotado).  ✅ Feito (03/10/2026).
→ Junto de "Salvar rascunho" e "Enviar no WhatsApp".

**M16. Proposta: valor do deslocamento digitado na observação** (já anotado). ✅ Feito (03/10/2026).
Com "Reembolso das despesas", não há campo de valor, e o valor digitado na observação entra solto no texto.
→ Explicar em cada opção onde vai o valor ("Reembolso: o cliente paga o que for gasto, sem valor fixo") e
avisar quando a observação tiver um valor em reais.

**M17. Opção do momento do briefing não faz nada** (já anotado, A fazer).

---

## Baixa

**B1.** ✅ Feito (03/10/2026). Propostas, Projetos, Contratos e Briefings não têm busca por nome (só Clientes tem). Vai pesar com
dezenas de clientes.

**B2.** ✅ Feito (03/10/2026). A linha do tempo do cliente não mostra os eventos da proposta (enviada, aprovada) nem as etapas
aprovadas.

**B3.** ✅ Feito (03/10/2026). Na ficha, "Arquivar ou excluir" fica acima de "Portal do cliente". A área de ações perigosas deveria
ser a última.

**B4.** ✅ Feito (03/10/2026). Excluir pedido de orçamento usa a caixa padrão do navegador ("confirm" e "alert"), diferente do resto
do sistema.

**B5.** ✅ Feito (03/10/2026). "Conceder como cortesia" não pede confirmação.

**B6.** ✅ Feito (03/10/2026). Na ficha, o texto diz que todos os links valem 30 dias, mas o do projeto vale 90.

---

## O que está bom e deve ficar como está

- Briefing do cliente: salva sozinho, avisa quando cai a internet, tem barra de progresso e uma tela de revisão antes de enviar.
- Aprovação de etapa pelo cliente: confirmação clara e aviso de quantas revisões restam (e de que a próxima pode ser cobrada).
- Tela "Este link não vale mais", com botão para pedir um novo no WhatsApp.
- Contatos: abas com contagem, encerrar com motivo e reabrir.
- Contrato assinado: registro completo do aceite (data, IP, navegador, código).

## Ordem sugerida

1. ~~A1, A5 e A8~~ feitos.
2. ~~A2, A3 e A4 (proposta)~~ feitos, com o M15.
3. A6 e A7 (painel).
4. ~~M1 a M3 e M10~~ feitos, com M5, M6, M8, M9, M12, M13, B3 e B6.
5. ~~Resto das médias e as baixas~~ feitos. Falta só o M17 (decisão do Igor) e a conferência visual no navegador.
