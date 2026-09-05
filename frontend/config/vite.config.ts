import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function apiProxyTarget(value: string | undefined): string {
  const candidate = value?.trim() || "http://127.0.0.1:8000";
  const parsed = new URL(candidate);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !["", "/"].includes(parsed.pathname)
  ) {
    throw new Error(
      "VITE_DEV_API_PROXY_TARGET must be an HTTP(S) origin without credentials or extra URL parts.",
    );
  }
  return parsed.origin;
}

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const fileEnvironment = loadEnv(mode, root, "VITE_");
  const proxyTarget = apiProxyTarget(
    process.env.VITE_DEV_API_PROXY_TARGET ?? fileEnvironment.VITE_DEV_API_PROXY_TARGET,
  );

  return {
    root,
    base: "./",
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../src", import.meta.url)),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": proxyTarget,
      },
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  };
});
