import type { Metadata } from "next";
import { CentralAjuda } from "@/components/ajuda/CentralAjuda";
import { capitulosAjuda } from "@/lib/manual";

export const metadata: Metadata = { title: "Ajuda" };

// Central de ajuda do arquiteto: o manual (docs/manual/manual.md) sem os trechos só de suporte.
export default function AjudaPage() {
  const capitulos = capitulosAjuda();
  return (
    <div className="pagina-app">
      <h1>Ajuda</h1>
      <p className="muted">
        Como cada parte do NorteArq funciona. Não achou? Use <strong>Relatar problema ou sugestão</strong> no menu.
      </p>
      {capitulos.length ? (
        <CentralAjuda capitulos={capitulos} />
      ) : (
        <p className="muted">A ajuda não carregou agora. Tente de novo em instantes.</p>
      )}
    </div>
  );
}
