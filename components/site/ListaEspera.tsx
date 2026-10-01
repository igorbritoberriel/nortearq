"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, MessageCircle } from "lucide-react";
import { entrarNaListaEspera, type EstadoListaEspera } from "@/app/(site)/acoes";
import { PLANOS } from "@/lib/modulos";
import { InputMascara } from "@/components/InputMascara";

const PERFIS = [
  { valor: "autonomo", rotulo: "Trabalho sozinho(a)" },
  { valor: "escritorio_pequeno", rotulo: "Escritório de 2 a 5 pessoas" },
  { valor: "escritorio_grande", rotulo: "Escritório com mais de 5 pessoas" },
  { valor: "estudante", rotulo: "Sou estudante" },
];

const DORES = [
  { valor: "briefing", rotulo: "Entender o que o cliente quer (briefing)" },
  { valor: "proposta_contrato", rotulo: "Fazer proposta e contrato" },
  { valor: "aprovacoes", rotulo: "Conseguir aprovações e organizar arquivos" },
  { valor: "revisoes_visitas", rotulo: "Revisões e visitas além do combinado" },
  { valor: "outro", rotulo: "Outra coisa" },
];

const UTMS = ["utm_source", "utm_medium", "utm_campaign"] as const;

const estadoInicial: EstadoListaEspera = { status: "inicial" };

export function ListaEspera() {
  const [estado, enviar, enviando] = useActionState(entrarNaListaEspera, estadoInicial);
  const [origem, setOrigem] = useState<Record<string, string>>({});
  const [plano, setPlano] = useState("");

  // Lê a origem da visita (anúncios, Instagram...) e o plano clicado na seção de preços.
  useEffect(() => {
    const ler = () => {
      const params = new URLSearchParams(window.location.search);
      const encontrados: Record<string, string> = {};
      for (const chave of UTMS) {
        const valor = params.get(chave);
        if (valor) encontrados[chave] = valor;
      }
      setOrigem(encontrados);
      const planoUrl = params.get("plano");
      if (planoUrl && PLANOS.some((p) => p.id === planoUrl)) setPlano(planoUrl);
    };
    ler();
    window.addEventListener("hashchange", ler);
    return () => window.removeEventListener("hashchange", ler);
  }, []);

  if (estado.status === "sucesso") {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nortearq.com.br";
    const convite = encodeURIComponent(
      `Achei um sistema para arquitetos em que o cliente responde o briefing sozinho pelo celular. Entrei na lista de espera: ${site}`,
    );
    return (
      <div className="lista-sucesso" role="status">
        <CircleCheck size={40} aria-hidden="true" />
        <h3>{estado.nome ? `Pronto, ${estado.nome}!` : "Pronto!"} Você está na lista.</h3>
        <p className="muted">
          Vamos avisar por e-mail assim que o NorteArq abrir. Quem está na lista testa antes de todo mundo.
        </p>
        <a
          className="botao botao-secundario"
          href={`https://wa.me/?text=${convite}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" />
          Indicar para um colega
        </a>
      </div>
    );
  }

  const erro = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form action={enviar} className="lista-form" noValidate>
      <div className="lista-linha">
        <Campo id="le-nome" rotulo="Nome" erro={erro.nome}>
          <input id="le-nome" name="nome" autoComplete="name" required defaultValue={v.nome} />
        </Campo>
        <Campo id="le-email" rotulo="E-mail" erro={erro.email}>
          <input id="le-email" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
        </Campo>
      </div>

      <div className="lista-linha">
        <Campo id="le-whatsapp" rotulo="WhatsApp" opcional erro={erro.whatsapp}>
          <InputMascara
            mascara="telefone"
            id="le-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            defaultValue={v.whatsapp}
          />
        </Campo>
        <Campo id="le-cidade" rotulo="Cidade / UF" opcional erro={erro.cidade}>
          <input id="le-cidade" name="cidade" autoComplete="address-level2" defaultValue={v.cidade} />
        </Campo>
      </div>

      <Campo id="le-perfil" rotulo="Como você trabalha?" erro={erro.perfil}>
        <select id="le-perfil" name="perfil" required defaultValue={v.perfil ?? ""} key={v.perfil}>
          <option value="" disabled>Escolha uma opção</option>
          {PERFIS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
          ))}
        </select>
      </Campo>

      <div className="lista-linha">
        <Campo id="le-dor" rotulo="O que mais toma seu tempo hoje?" opcional>
          <select id="le-dor" name="maior_dor" defaultValue={v.maior_dor ?? ""} key={v.maior_dor}>
            <option value="">Prefiro não dizer</option>
            {DORES.map((d) => (
              <option key={d.valor} value={d.valor}>{d.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo id="le-plano" rotulo="Plano de interesse" opcional>
          <select id="le-plano" name="plano_interesse" value={plano} onChange={(e) => setPlano(e.target.value)}>
            <option value="">Ainda não sei</option>
            {PLANOS.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} · R$ {p.preco}/mês</option>
            ))}
          </select>
        </Campo>
      </div>

      <label className="lista-check">
        <input type="checkbox" name="aceita_conversa" defaultChecked={v.aceita_conversa === "on"} />
        <span>Topo uma conversa de 20 minutos para ajudar a construir o NorteArq.</span>
      </label>

      <label className={`lista-check ${erro.aceite ? "com-erro" : ""}`}>
        <input type="checkbox" name="aceite" required defaultChecked={v.aceite === "on"} aria-invalid={!!erro.aceite} />
        <span>
          Li e aceito a <Link href="/privacidade" target="_blank">política de privacidade</Link>.
        </span>
      </label>
      {erro.aceite && <p className="campo-erro">{erro.aceite}</p>}

      {/* Armadilha para robôs: invisível para pessoas. */}
      <div className="lista-armadilha" aria-hidden="true">
        <label htmlFor="le-site">Site</label>
        <input id="le-site" name="site" tabIndex={-1} autoComplete="off" />
      </div>
      {Object.entries(origem).map(([chave, valor]) => (
        <input key={chave} type="hidden" name={chave} value={valor} />
      ))}

      {estado.status === "erro" && estado.mensagem && (
        <p className="lista-aviso" role="alert">{estado.mensagem}</p>
      )}

      <button className="botao botao-primario botao-bloco" type="submit" disabled={enviando}>
        {enviando ? "Enviando..." : "Quero entrar na lista"}
      </button>
      <p className="lista-rodape">Sem spam. Sair da lista é só responder qualquer e-mail nosso.</p>
    </form>
  );
}

function Campo({
  id,
  rotulo,
  opcional,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`campo ${erro ? "com-erro" : ""}`}>
      <label htmlFor={id}>
        {rotulo} {opcional && <small>(opcional)</small>}
      </label>
      {children}
      {erro && <p className="campo-erro">{erro}</p>}
    </div>
  );
}
