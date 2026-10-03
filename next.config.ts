import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desenvolvimento: deixa abrir o sistema pelo celular na mesma rede Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*"],
  // Central de ajuda e perguntas frequentes do cliente leem o manual (lib/manual.ts): o arquivo vai junto.
  outputFileTracingIncludes: {
    "/*": ["./docs/manual/manual.md"],
  },
};

export default nextConfig;
