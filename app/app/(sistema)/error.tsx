"use client";

import { RelatarProblema } from "@/components/erros/RelatarProblema";
import { TelaErro } from "@/components/erros/TelaErro";

// Erro dentro do sistema do arquiteto: o menu lateral continua, e dá para contar o que estava fazendo.
export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="pagina-app">
      <TelaErro
        error={error}
        retry={retry}
        inicio="/app"
        extra={<RelatarProblema tipoInicial="problema" rotulo="Contar o que eu estava fazendo" destaque />}
      />
    </div>
  );
}
