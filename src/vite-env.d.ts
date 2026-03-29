/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIMESTAMP__: string;

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL: string;
  readonly VITE_GATEWAY_TOKEN: string;
  readonly VITE_GATEWAY_WS_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
