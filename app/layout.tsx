import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Títulos com contraste de revista de arquitetura, texto limpo e rótulos de prancha técnica.
const fonteTitulo = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--fonte-titulo", display: "swap" });
const fonteTexto = Hanken_Grotesk({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });
const fonteTecnica = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fonte-tecnica", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "NorteArq · O norte do seu projeto",
    template: "%s · NorteArq",
  },
  description:
    "Briefing visual, proposta, contrato e acompanhamento de projeto para arquitetos. Seu cliente explica o que quer sozinho. Você só projeta.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NorteArq",
    title: "NorteArq · Seu cliente explica o que quer sozinho. Você só projeta.",
    description:
      "Briefing visual com quiz de estilo, proposta e contrato automáticos e aprovações registradas. Tudo por link no WhatsApp, com a marca do seu escritório.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTexto.variable} ${fonteTitulo.variable} ${fonteTecnica.variable}`}>
      <body>{children}</body>
    </html>
  );
}
