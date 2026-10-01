import type { ModuloId } from "./modulos";

// Menu lateral do sistema do arquiteto (/app).
export type ItemMenu = {
  href: string;
  rotulo: string;
  modulo: ModuloId;
};

export const MENU_ARQUITETO: ItemMenu[] = [
  { href: "/app", rotulo: "Início", modulo: "00" },
  { href: "/app/contatos", rotulo: "Contatos", modulo: "01" },
  { href: "/app/clientes", rotulo: "Clientes", modulo: "00" },
  { href: "/app/propostas", rotulo: "Propostas", modulo: "01" },
  { href: "/app/contratos", rotulo: "Contratos", modulo: "01" },
  { href: "/app/briefings", rotulo: "Briefings", modulo: "02" },
  { href: "/app/projetos", rotulo: "Projetos", modulo: "03" },
  { href: "/app/obras", rotulo: "Obras", modulo: "04" },
  { href: "/app/configuracoes", rotulo: "Configurações", modulo: "00" },
];
