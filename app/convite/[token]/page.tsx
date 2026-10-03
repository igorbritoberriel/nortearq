import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AceitarConvite, CriarContaConvite } from "@/components/equipe/AceitarConvite";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Convite para a equipe", robots: { index: false } };

type ConvitePublico = { email: string; nome: string; papel: string; escritorio: string; valido: boolean; aceito: boolean };

const NOME_PAPEL: Record<string, string> = { administrador: "Administrador", colaborador: "Colaborador" };

// Convite para a equipe (0024): cria a senha e entra, ou aceita se já estiver conectado com o e-mail certo.
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await criarClienteServidor();
  const { data } =
    /^[0-9a-f]{32,128}$/.test(token) && supabase ? await supabase.rpc("convite_publico", { p_token: token }) : { data: null };
  const convite = data as ConvitePublico | null;
  const logado = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <main className="auth">
      <div className="cartao">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Logo />
        </div>
        {!convite ? (
          <p>Convite não encontrado. Confira o link ou peça um novo ao dono do escritório.</p>
        ) : convite.aceito ? (
          <p>
            Este convite já foi aceito. <Link href="/entrar">Entrar</Link>
          </p>
        ) : !convite.valido ? (
          <p>Este convite venceu ou foi cancelado. Peça um novo ao dono do {convite.escritorio}.</p>
        ) : (
          <>
            <h1 className="auth-titulo">Convite para o {convite.escritorio}</h1>
            <p className="muted">
              Você foi convidado(a) como <strong>{NOME_PAPEL[convite.papel] ?? convite.papel}</strong>, com o e-mail{" "}
              <strong>{convite.email}</strong>.
            </p>
            {logado ? (
              logado.email?.toLowerCase() === convite.email.toLowerCase() ? (
                <AceitarConvite token={token} />
              ) : (
                <p className="aviso aviso-erro">
                  Você está conectado como {logado.email}. Saia e entre com {convite.email} para aceitar.
                </p>
              )
            ) : (
              <>
                <CriarContaConvite token={token} nome={convite.nome} />
                <p className="muted auth-rodape">
                  Já tenho conta: <Link href={`/entrar?proximo=/convite/${token}`}>entrar e aceitar</Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
