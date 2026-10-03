"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { registrarMiniatura, reservarMiniatura } from "@/app/app/(sistema)/projetos/acoes";
import { enviarDerivados, gerarDerivados } from "@/lib/miniaturas";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Arquivos enviados antes das miniaturas existirem: gera em segundo plano, uma vez, quando o arquiteto
// abre o projeto. O banco reserva cada arquivo (duas pessoas abrindo juntas não geram em dobro).
// Até lá, o cartão mostra o ícone do tipo. No máximo 12 por visita, para não pesar no navegador.

export type Pendente = { id: string; nome: string; tipo: string | null; caminho: string; url: string };

export function MiniaturasPendentes({ projetoId, pendentes }: { projetoId: string; pendentes: Pendente[] }) {
  const router = useRouter();
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current || pendentes.length === 0) return;
    rodou.current = true;
    const supabase = criarClienteNavegador();
    if (!supabase) return;
    void (async () => {
      let geradas = 0;
      for (const p of pendentes.slice(0, 12)) {
        if (!(await reservarMiniatura(p.id))) continue;
        try {
          const resposta = await fetch(p.url);
          if (!resposta.ok) continue;
          const blob = await resposta.blob();
          const derivados = await gerarDerivados(blob, p.nome);
          if (!derivados) {
            await registrarMiniatura(projetoId, p.id, null); // não insiste num arquivo que não abre
            continue;
          }
          const extras = await enviarDerivados(supabase.storage, p.caminho, derivados);
          if (extras && (await registrarMiniatura(projetoId, p.id, extras))) geradas += 1;
        } catch (erro) {
          console.warn("[miniatura]", p.nome, erro);
        }
      }
      if (geradas > 0) router.refresh();
    })();
  }, [pendentes, projetoId, router]);

  return null;
}
