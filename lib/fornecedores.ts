export type Fornecedor = {
  id: string; nome: string; documento: string | null; contato: string | null;
  telefone: string | null; email: string | null; segmento: string | null;
  observacoes: string | null; arquivado_em: string | null;
};
export const CAMPOS_FORNECEDOR = "id,nome,documento,contato,telefone,email,segmento,observacoes,arquivado_em";
export const normalizarFornecedor = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const SEGMENTOS_FORNECEDOR = ["Marmoraria e pedras", "Marcenaria e móveis planejados", "Móveis e decoração", "Iluminação", "Revestimentos e pisos", "Louças e metais", "Vidraçaria", "Esquadrias", "Serralheria", "Materiais de construção", "Tintas e pintura", "Gesso e drywall", "Cortinas e persianas", "Climatização", "Automação e segurança", "Paisagismo e jardinagem", "Construção e reformas", "Instalações elétricas", "Instalações hidráulicas", "Engenharia e projetos complementares", "Maquetes e renderização"] as const;
