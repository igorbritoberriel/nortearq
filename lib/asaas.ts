import "server-only";

// Asaas: cobrança recorrente da assinatura do arquiteto (Pix, boleto ou cartão, à escolha dele na
// página de pagamento do Asaas). O NorteArq nunca vê dados de cartão.
// Variáveis: ASAAS_API_KEY, ASAAS_AMBIENTE ("sandbox" para testes, "producao" para valer)
// e ASAAS_WEBHOOK_TOKEN (senha que o Asaas manda nos avisos de pagamento).

const BASE = () =>
  process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

export const asaasConfigurado = () => !!process.env.ASAAS_API_KEY;

async function chamar<T>(caminho: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
  const resposta = await fetch(`${BASE()}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "NorteArq",
      access_token: process.env.ASAAS_API_KEY ?? "",
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    cache: "no-store",
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erros = (dados as { errors?: { description?: string }[] }).errors;
    throw new Error(erros?.map((e) => e.description).join(" ") || `Asaas respondeu ${resposta.status}`);
  }
  return dados as T;
}

export async function criarClienteAsaas(dados: {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string | null;
  escritorioId: string;
}) {
  return chamar<{ id: string }>("/customers", {
    metodo: "POST",
    corpo: {
      name: dados.nome,
      cpfCnpj: dados.cpfCnpj,
      email: dados.email,
      mobilePhone: dados.telefone ?? undefined,
      externalReference: dados.escritorioId,
      notificationDisabled: false,
    },
  });
}

export type AssinaturaAsaas = { id: string; status: string; nextDueDate: string; value: number; cycle: string };

export async function criarAssinaturaAsaas(dados: {
  clienteAsaas: string;
  valor: number;
  ciclo: "MONTHLY" | "YEARLY";
  primeiroVencimento: string; // AAAA-MM-DD
  descricao: string;
  escritorioId: string;
}) {
  return chamar<AssinaturaAsaas>("/subscriptions", {
    metodo: "POST",
    corpo: {
      customer: dados.clienteAsaas,
      billingType: "UNDEFINED", // o arquiteto escolhe Pix, boleto ou cartão na página do Asaas
      value: dados.valor,
      nextDueDate: dados.primeiroVencimento,
      cycle: dados.ciclo,
      description: dados.descricao,
      externalReference: dados.escritorioId,
    },
  });
}

export async function atualizarAssinaturaAsaas(
  id: string,
  dados: { valor: number; ciclo: "MONTHLY" | "YEARLY"; descricao: string },
) {
  return chamar<AssinaturaAsaas>(`/subscriptions/${id}`, {
    metodo: "POST",
    corpo: { value: dados.valor, cycle: dados.ciclo, description: dados.descricao, updatePendingPayments: true },
  });
}

export async function cancelarAssinaturaAsaas(id: string) {
  return chamar<{ deleted: boolean }>(`/subscriptions/${id}`, { metodo: "DELETE" });
}

export type CobrancaAsaas = { id: string; status: string; dueDate: string; value: number; invoiceUrl: string };

// Próxima cobrança em aberto da assinatura (a página de pagamento é o invoiceUrl).
export async function cobrancaEmAberto(assinaturaId: string) {
  const r = await chamar<{ data: CobrancaAsaas[] }>(`/subscriptions/${assinaturaId}/payments?limit=20`);
  return (
    r.data
      .filter((c) => c.status === "PENDING" || c.status === "OVERDUE")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null
  );
}
