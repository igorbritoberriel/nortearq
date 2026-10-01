import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desenvolvimento: deixa abrir o sistema pelo celular na mesma rede Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
