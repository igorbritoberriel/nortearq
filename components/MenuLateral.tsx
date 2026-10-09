"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ContactRound, Users, FileText, FileSignature, ClipboardList, Folder, ChartNoAxesColumnIncreasing, Settings, CircleHelp, CreditCard, LayoutDashboard, Store } from "lucide-react";
const ICONES = { "/app/fornecedores": Store, "/app": House, "/app/contatos": ContactRound, "/app/clientes": Users, "/app/propostas": FileText, "/app/contratos": FileSignature, "/app/briefings": ClipboardList, "/app/projetos": Folder, "/app/financeiro": ChartNoAxesColumnIncreasing, "/app/configuracoes": Settings, "/app/ajuda": CircleHelp, "/app/assinatura": CreditCard, "/app/interno": LayoutDashboard };

// Links do menu lateral com o item da tela atual destacado (M12 da revisão de UX).
// No celular, o menu recolhido (M11) fecha sozinho ao trocar de tela.
export function MenuLateral({ itens }: { itens: { href: string; rotulo: string; classe?: string }[] }) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/app" ? caminho === "/app" : caminho === href || caminho.startsWith(`${href}/`));

  useEffect(() => {
    const chave = document.getElementById("menu-movel") as HTMLInputElement | null;
    if (chave) chave.checked = false;
  }, [caminho]);

  return (
    <>
      {itens.map((item) => { const Icone = ICONES[item.href as keyof typeof ICONES]; return (
        <Link
          key={item.href}
          href={item.href}
          className={[item.classe, ativo(item.href) ? "ativo" : ""].filter(Boolean).join(" ") || undefined}
          aria-current={ativo(item.href) ? "page" : undefined}
        >
          {Icone && <Icone size={20} aria-hidden="true" />}<span>{item.rotulo}</span>
        </Link>
      ); })}
    </>
  );
}
