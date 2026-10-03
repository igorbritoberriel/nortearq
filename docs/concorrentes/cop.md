# Concorrente: COP (cop.arq.br)

Arquivado em 03/10/2026 a partir do PDF "Análise de concorrente COP (cop.arq.br)". A segunda parte
compara com o NorteArq e registra o que decidimos aproveitar ou não.

## 1. Resumo da análise original

**O que é:** SaaS brasileiro de gestão para escritórios de arquitetura e interiores.
R$ 89/mês (até 4 pessoas) ou R$ 897/ano (até 8 pessoas). Tese: "a informação do escritório está
espalhada (WhatsApp, planilha, Word, memória) e por isso ninguém sabe se cada projeto dá lucro".

- **Posicionamento:** "estrutura pronta para arquitetura" contra planilha, Notion e Trello.
- **Coração do produto:** hora lançada na tarefa → custo do projeto → margem → relatório financeiro.
- **Vendas:** SEO (18 páginas-guia), quiz "Diagnóstico de gestão" e checkout direto. Sem teste grátis;
  garantia de 7 dias.
- **Credibilidade:** "criado por uma arquiteta que precisava resolver a gestão do próprio escritório".
- **Ponto fraco mais visível:** nenhuma prova social no site.

### Dores que atacam
| Dor | Como o COP resolve |
|---|---|
| Projeto termina e ninguém sabe se deu lucro | Timer de horas + custos = margem por projeto (rentabilidade no anual) |
| Proposta demora mais de uma semana | Precificação por hora ou m² com custos, impostos e margem; gerador de propostas (anual) |
| Atraso só aparece quando o cliente reclama | Painel de etapas, tarefas com dono e prazo |
| Fim do mês vira mutirão de planilha | Fluxo de caixa, contas a pagar/receber, DRE, OFX e conciliação (anual) |
| Retrabalho e "revisão infinita" | Briefing ligado ao projeto; aprovações e aditivos por etapa |
| Delegação por WhatsApp se perde | Tarefas com projeto e responsável |
| Obra fora de controle | Módulo pago à parte: diário, cronograma, pendências, financeiro da obra |

### Módulos
Clientes e CRM (funil) · Propostas e precificação · Projetos e etapas (templates) · Tarefas e equipe
(timer) · Financeiro (contas, fluxo de caixa, DRE, OFX) · Agenda · Contratos e documentos · Briefings
prontos · Portal do Cliente (só anual) · Gestão de Obras (à parte) · COPi (chat com IA).
**Não faz:** RRT/ART, nota fiscal, cobrança Pix/boleto do cliente final, assinatura eletrônica, integrações.

### Planos
| | Mensal | Anual |
|---|---|---|
| Preço | R$ 89/mês | R$ 897 à vista (≈ R$ 74,75/mês) |
| Usuários | até 4 | até 8 |
| Extra do anual | — | Portal do Cliente, gerador de propostas, contrato "blindado", OFX, horas previstas × realizadas, rentabilidade |
| Cancelamento | a qualquer momento | contrato de 12 meses |

### Brechas apontadas
Sem prova social · sem teste grátis · recursos-chave presos no anual · teto de 8 usuários · preço oculto
da obra · sem cobrança do cliente, nota fiscal e assinatura eletrônica · sem integrações · migração manual.

Outros concorrentes para analisar depois: Vobi, Projete.app, ARQPROJECT, ArqDesk, ProjetoList, Plana
Software, escritorio.arq.br, Sole.

## 2. Comparativo com o NorteArq

**Diferença de centro:** o COP organiza o escritório **por dentro** (horas, custo, margem, caixa,
tarefas). O NorteArq organiza a relação **com o cliente** (captação, briefing, proposta, contrato,
aprovações, revisões, portal), e o cliente vê a marca do escritório. Há sobreposição em CRM, propostas,
contratos, briefing, portal e obra, mas a promessa é outra.

| Dor do arquiteto | COP | NorteArq |
|---|---|---|
| Perder tempo com quem não fecha | Funil de leads | ✅ Formulário com filtro de compatibilidade (faixa de preço, prazo) |
| Cliente não sabe explicar o que quer | Briefing pronto por tipo | ✅ Briefing que o cliente responde sozinho + quiz visual de estilo + Perfil do Cliente |
| Proposta demora | Precificação com custos e margem | ✅ Modelos por serviço, desconto à vista, parcelas, aprovação pelo link · ❌ sem calculadora de honorários |
| Contrato feito à mão | Cláusulas editáveis (anual) | ✅ Gerado da proposta, aceite eletrônico com IP e código de verificação |
| Revisão infinita / cliente "não lembra" | Aprovações por etapa | ✅ Contador de revisões visível aos dois lados, aditivos aprovados pelo cliente |
| Arquivos espalhados | — | ✅ Arquivos com versões, visualizador, renders, capa |
| Cliente cobrando notícia | Portal (só anual) | ✅ Link no WhatsApp + portal com a marca do escritório |
| Saber se o projeto deu lucro | ✅ Timer → margem → DRE | ❌ Não faz (decisão: fora do escopo) |
| Fim do mês / financeiro | ✅ Contas, fluxo de caixa, DRE, OFX | 🟡 Só controle de parcelas e recibo |
| Delegar para a equipe | ✅ Tarefas e timer | 🟡 Perfis de equipe, sem tarefas |
| Obra | Módulo à parte | 🟡 Fase 2 |

## 3. Decisões e sugestões (a validar com o Igor)
Ver a conversa de 03/10/2026 e `docs/ideias-e-ajustes.md`.
- **Não copiar:** timer de horas, DRE, contas a pagar, OFX/conciliação, tarefas completas, chat de IA.
  São o terreno de software de gestão/contabilidade e pesam na implantação.
- **Aproveitar, em versão leve:** calculadora de honorários (hora técnica ou m²) dentro da proposta;
  "saúde do projeto" com dados que já temos (revisões, aditivos, recebido × contratado, prazo das etapas);
  dados de exemplo no teste grátis; prova social e vídeo no site; conteúdo SEO e calculadora gratuita
  como isca; importar clientes de planilha.
- **Brecha que o NorteArq pode ocupar:** cobrança do cliente final por Pix/boleto pelo próprio sistema
  (já usamos o Asaas na assinatura).
- **Preço:** o COP dá 4 pessoas por R$ 89; nosso Profissional é 1 pessoa por R$ 97. Reavaliar.
