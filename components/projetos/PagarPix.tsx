"use client";

import { useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";

// "Pagar com Pix" numa parcela, para o cliente: QR Code (gerado no servidor) e Pix copia e cola.
export function PagarPix({ codigo, qrSvg, recebedor }: { codigo: string; qrSvg: string; recebedor: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  if (!aberto) {
    return (
      <button type="button" className="botao botao-marca botao-pequeno pagar-pix-botao" onClick={() => setAberto(true)}>
        <QrCode size={16} aria-hidden="true" />
        Pagar com Pix
      </button>
    );
  }
  return (
    <div className="pagar-pix">
      {/* SVG gerado no servidor a partir do código Pix (sem conteúdo de terceiros). */}
      <div className="pagar-pix-qr" aria-label="QR Code do Pix" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="campo-ajuda">
        Abra o app do seu banco, escolha <strong>Pix → Ler QR Code</strong> ou <strong>Pix copia e cola</strong>. O pagamento vai
        direto para <strong>{recebedor}</strong>.
      </p>
      <code className="pagar-pix-codigo">{codigo}</code>
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            window.prompt("Copie o código Pix:", codigo);
          }
        }}
      >
        {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copiado ? "Código copiado" : "Copiar Pix copia e cola"}
      </button>
      <p className="campo-ajuda">Depois de pagar, o escritório confirma o recebimento e o recibo aparece aqui.</p>
    </div>
  );
}
