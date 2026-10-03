# NorteArq: contexto para o assistente

> **IDIOMA: SEMPRE PORTUGUÊS DO BRASIL.** Todas as respostas ao usuário, perguntas, resumos,
> mensagens de commit, comentários de código, textos da interface e documentação são em
> português do Brasil, sem exceção. O usuário dita por voz e às vezes a mensagem chega com
> trechos em inglês: mesmo assim, responda sempre em português.

SaaS brasileiro para arquitetos e designers de interiores. Todo o texto da interface e da
documentação é em **português do Brasil**.

**Especificação completa (regras RN-xx, planos, telas): `docs/especificacao-v1.md`. Leia antes de implementar.**

**Anotações do usuário: `docs/ideias-e-ajustes.md`.** Leia no começo de cada conversa, lembre o usuário
do que estiver pendente e mova para "Feito" o que for concluído.

## Produto
- Promessa: "Seu cliente explica o que quer sozinho. Você só projeta."
- Três áreas: site de vendas `(site)`, sistema do arquiteto `/app` (login), área do cliente
  final (`/e/[escritorio]` público, `/c/[token]` links sem login, `/portal` com login).
- O cliente final sempre vê a **marca do escritório**, não a do NorteArq.
- Módulos e planos: `lib/modulos.ts` (fonte única). Fase 1 = módulos 00–03.
- Diferenciais: briefing configurável com quiz visual de estilo; contrato gerado do
  briefing/proposta; "controle do contratado" (revisões, visitas, aditivos visíveis ao cliente);
  tudo chega ao cliente por link no WhatsApp.

## Fluxo
contato (briefing preliminar + filtro de compatibilidade) → proposta → contrato → pagamento
inicial → briefing detalhado → etapas do projeto com aprovação → (obra opcional) → pós-entrega.

## Código
- Next.js 16 App Router, React 19, TypeScript estrito. `params` de páginas dinâmicas é Promise.
- Supabase via `lib/supabase/{client,server}.ts` (retornam null sem `.env.local`).
- Banco: `supabase/migrations/`; multi-inquilino por `escritorio_id` com RLS.
- CSS simples em `app/globals.css`; sem Tailwind.
- Telas ainda não implementadas usam `<EmConstrucao>` com a lista do que devem ter;
  substitua pelo conteúdo real ao implementar.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
