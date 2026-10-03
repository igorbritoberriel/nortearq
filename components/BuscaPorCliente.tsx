import Link from "next/link";
import { Search } from "lucide-react";

// Busca pelo nome do cliente nas listas (B1 da revisão de UX). Formulário GET: funciona sem JavaScript.
export function BuscaPorCliente({ busca, limpar }: { busca: string; limpar: string }) {
  return (
    <form className="filtros" role="search">
      <label className="filtros-busca">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Buscar pelo nome do cliente</span>
        <input name="q" type="search" placeholder="Buscar pelo nome do cliente" defaultValue={busca} />
      </label>
      <button type="submit" className="botao botao-secundario botao-pequeno">
        Buscar
      </button>
      {busca && (
        <Link className="botao botao-fantasma botao-pequeno" href={limpar}>
          Limpar
        </Link>
      )}
    </form>
  );
}

// Termo seguro para o filtro do Supabase (vírgula, parênteses e curingas ficam de fora).
export function termoDaBusca(q: string | undefined) {
  return (q ?? "").trim().slice(0, 80).replace(/[,()%*\\]/g, " ").trim();
}
