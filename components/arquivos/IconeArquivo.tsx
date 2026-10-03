import { Box, File, FileImage, FileSpreadsheet, FileText, PenTool } from "lucide-react";
import { extensao, formatoDe } from "@/lib/arquivos";

// Ícone do tipo de arquivo, com a extensão em destaque (DWG, SKP...): usado quando não há miniatura.
export function IconeArquivo({ nome, tipo, grande }: { nome: string; tipo: string | null; grande?: boolean }) {
  const ext = extensao(nome);
  const formato = formatoDe(nome, tipo);
  const tamanho = grande ? 56 : 30;
  const Icone =
    formato === "pdf"
      ? FileText
      : formato === "imagem"
        ? FileImage
        : ["dwg", "dxf"].includes(ext)
          ? PenTool
          : ["skp", "rvt", "ifc", "pln", "3dm", "max", "obj", "fbx"].includes(ext)
            ? Box
            : ["xls", "xlsx", "csv", "ods"].includes(ext)
              ? FileSpreadsheet
              : ["doc", "docx", "odt", "txt"].includes(ext)
                ? FileText
                : File;
  return (
    <span className={`icone-arquivo icone-arquivo-${formato} ${grande ? "icone-arquivo-grande" : ""}`} aria-hidden="true">
      <Icone size={tamanho} strokeWidth={1.5} />
      {ext && <span className="icone-arquivo-ext">{ext.slice(0, 4).toUpperCase()}</span>}
    </span>
  );
}
