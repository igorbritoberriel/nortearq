"use client";

import { TelaErro } from "@/components/erros/TelaErro";

// Erro em qualquer página fora do sistema do arquiteto (site, área do cliente, login).
export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="container" style={{ padding: "64px 16px" }}>
      <TelaErro error={error} retry={retry} />
    </main>
  );
}
