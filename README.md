# NorteArq

> **O norte do seu projeto.** Seu cliente explica o que quer sozinho. Você só projeta.

SaaS para arquitetos e designers de interiores: briefing visual, proposta, contrato,
aprovações de projeto e acompanhamento de obra, com a marca do escritório.

**Status:** Fase 1 em andamento. Prontos: login, configuração inicial, formulário público, contatos, clientes, briefing, proposta, contrato e projeto (etapas e aprovações). As telas ainda não feitas mostram a lista do que vão ter.

---

## Como rodar no VS Code

1. Abra **esta pasta** (`nortearq`) no VS Code: *Arquivo → Abrir pasta*.
2. Abra o terminal (`Ctrl + '`) e instale as dependências (só na primeira vez):
   ```bash
   npm install
   ```
3. Rode o projeto:
   ```bash
   npm run dev
   ```
4. Acesse **http://localhost:3000**.

O site roda sem banco de dados. Para ligar o Supabase, veja a seção abaixo.

## Telas para visitar

| Área | Endereço |
|---|---|
| Landing page | http://localhost:3000 |
| Preços | http://localhost:3000/precos |
| Login / Cadastro | http://localhost:3000/entrar · /cadastro · /recuperar-senha |
| Configuração inicial | http://localhost:3000/app/onboarding (aparece sozinha no 1º acesso) |
| Sistema do arquiteto | http://localhost:3000/app |
| Formulário público do escritório | http://localhost:3000/e/studio-ana |
| Briefing do cliente (exemplo, sem banco) | http://localhost:3000/c/exemplo/briefing |
| Briefings / Perfil do Cliente / Editor | http://localhost:3000/app/briefings · /app/briefings/editor |
| Proposta do cliente (exemplo, sem banco) | http://localhost:3000/c/exemplo/proposta |
| Portal do cliente | http://localhost:3000/portal |

## Estrutura de pastas

```
app/
├── (site)/              → SITE DE VENDAS (landing, preços)
├── (auth)/              → entrar, cadastro, recuperar-senha
├── app/                 → SISTEMA DO ARQUITETO (/app)
│   ├── contatos/            01 · pedidos de orçamento
│   ├── clientes/            00 · lista e ficha do cliente
│   ├── propostas/           01
│   ├── contratos/           01
│   ├── briefings/           02 · respostas + editor de briefing
│   ├── projetos/            03 · etapas, arquivos, aprovações
│   ├── obras/               04 · visitas
│   ├── configuracoes/       00 · marca, serviços, plano
│   └── onboarding/          00 · assistente pós-cadastro
├── e/[escritorio]/      → formulário público do escritório (01)
├── c/[token]/           → LINKS DO CLIENTE SEM LOGIN (briefing, proposta, contrato)
└── portal/              → PORTAL DO CLIENTE COM LOGIN
components/              → componentes reutilizáveis
lib/
├── modulos.ts           → catálogo de módulos e planos (fonte única)
├── navegacao.ts         → menu do sistema
└── supabase/            → conexão com o Supabase
supabase/migrations/     → estrutura do banco de dados (SQL)
```

## Ligar o Supabase

1. Crie um projeto grátis em https://supabase.com.
2. Em **SQL Editor**, cole e execute, nesta ordem, `supabase/migrations/0001_schema_inicial.sql`,
   `0002_lista_espera.sql` (lista de espera do site), `0003_cadastro_e_onboarding.sql` (cadastro,
   configuração inicial e logo) `0004_formulario_e_contatos.sql` (formulário público e contatos), `0005_clientes_e_links.sql`
   (clientes e links do cliente), `0006_briefing.sql` (briefing, quiz de estilo e fotos),
   `0007_propostas.sql` (propostas, versões e resposta do cliente), `0008_contratos.sql` (contrato com
   aceite eletrônico, projeto e pagamentos), `0009_ajuste_link_proposta.sql`, `0010_projetos.sql`
   (etapas, arquivos com versões e aprovações do cliente) e `0011_deslocamento.sql` (deslocamento das visitas).
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave (*Project Settings → API*).
4. Para o envio de fotos do briefing e os avisos por e-mail, preencha também `SUPABASE_SECRET_KEY`
   (chave secreta, só o servidor usa) e `RESEND_API_KEY` (veja "Avisos por e-mail").
5. Reinicie o `npm run dev`.

## Avisos por e-mail

O arquiteto recebe e-mail quando chega um pedido de orçamento, quando um cliente envia o briefing e
quando responde a proposta; o arquiteto e o cliente recebem e-mail quando o contrato é assinado
(`lib/avisos.ts`, envio pelo Resend em `lib/email.ts`).

1. Crie uma conta grátis em https://resend.com e gere uma API key.
2. No `.env.local`: `RESEND_API_KEY=...` e `SUPABASE_SECRET_KEY=...` (para descobrir o e-mail do arquiteto).
3. Para testar, o remetente `onboarding@resend.dev` só entrega no e-mail da sua conta Resend. Para
   lançar, verifique o domínio (ex.: nortearq.com.br) no Resend e troque `EMAIL_REMETENTE`.

Sem a chave, nada quebra: o aviso só aparece no terminal.

## Site de vendas (pré-lançamento)

- Todas as chamadas levam à **lista de espera** (`/#lista-espera`). No lançamento, troque
  `PRE_LANCAMENTO` para `false` em `lib/site.ts` e os botões passam a levar ao cadastro.
- Inscrições ficam na tabela `lista_espera` (Supabase → *Table Editor*). O site só consegue inserir;
  ler e exportar (CSV) é pelo painel. Origem das visitas: parâmetros `utm_source`, `utm_medium` e
  `utm_campaign` do link.
- Sem `.env.local`, em desenvolvimento o formulário mostra sucesso e só registra no terminal; em
  produção, ele avisa que não conseguiu salvar.
- Visual e animações seguem as skills da pasta `skills/` (video-to-website + frontend-design):
  `components/site/MotorAnimacao.tsx` (Lenis + GSAP) e `components/site/PlantaBaixa.tsx` (cena central,
  que será trocada pelo vídeo).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Supabase**: banco Postgres, login, armazenamento de arquivos
- CSS simples em `app/globals.css` (cores provisórias em `:root`)
- Ícones: `lucide-react` · Validação: `zod`
- Hospedagem sugerida: **Vercel**

## Roteiro de desenvolvimento

### Fase 1: primeira versão (Base + 01 + 02 + 03)
- [x] Login e cadastro do arquiteto (Supabase Auth) + proteção de `/app` e `/portal` (`proxy.ts`)
- [x] Onboarding: marca, serviços, faixa de preço (e Configurações com os mesmos formulários)
- [x] Formulário público `/e/[escritorio]` → tabela `contatos` + filtro de compatibilidade (tela Contatos)
- [x] Aviso ao arquiteto por e-mail: novo contato e briefing respondido (Resend)
- [x] Cadastro de cliente + geração de links `/c/[token]` + botão "enviar no WhatsApp"
- [x] Briefing do cliente (arquitetura / interiores por ambiente / reforma) + quiz de estilo + fotos
- [x] Editor de briefing do arquiteto + banco de imagens de estilo
- [x] Perfil do Cliente em PDF (impressão do navegador → "Salvar como PDF")
- [x] Banco de imagens de estilo padrão do NorteArq: 24 imagens geradas por IA no Canva (3 por estilo), em `estilos/padrao/`
- [x] Proposta: criar, versões, enviar, aprovar / pedir ajuste / recusar (com IP), motivos de recusa
- [x] Deslocamento para visitas fora da cidade na proposta (incluído, taxa fixa, por km ou reembolso) e no contrato
- [x] Contrato automático do modelo do escritório + aceite eletrônico próprio (data, hora, IP, código SHA-256)
- [x] Contrato assinado cria o projeto com as etapas padrão e os pagamentos (controle pago/pendente)
- [ ] Revisão do modelo de contrato por advogado (decisão 11) · ZapSign/Clicksign, se for preciso
- [x] Projeto: etapas (renomear, reordenar, adicionar), arquivos com versões Rev01/Rev02 e visibilidade,
  envio para aprovação, aprovação/revisão pelo cliente via link (com IP), contador de revisões e cortesia
- [ ] Aditivos (revisão excedente cobrada, mudança em etapa aprovada) e aprovações externas (RN-03.15 a 03.17)
- [ ] Portal do cliente
- [ ] Cobrança da assinatura (Asaas, Stripe ou Mercado Pago)

### Fase 2
- [ ] 04 · Obra: visitas com contador, alterações, vistoria
- [ ] 05 · Pós-entrega: avaliação e depoimento
- [ ] Avisos automáticos por WhatsApp

### Fase 3
- [ ] 06 · Adicionais: página do arquiteto, IA, loja de modelos, rede de indicação
