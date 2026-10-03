"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      {itens.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[item.classe, ativo(item.href) ? "ativo" : ""].filter(Boolean).join(" ") || undefined}
          aria-current={ativo(item.href) ? "page" : undefined}
        >
          {item.rotulo}
        </Link>
      ))}
    </>
  );
}
