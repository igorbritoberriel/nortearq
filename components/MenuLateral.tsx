"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Links do menu lateral com o item da tela atual destacado (M12 da revisão de UX).
export function MenuLateral({ itens }: { itens: { href: string; rotulo: string; classe?: string }[] }) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/app" ? caminho === "/app" : caminho === href || caminho.startsWith(`${href}/`));
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
