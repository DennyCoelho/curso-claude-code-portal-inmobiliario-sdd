import { createRequire } from "node:module";
import type { ImageProps } from "next/image";
import nextConfig from "../next.config";

// Reproduzir o default CommonJS e a configuração que o bundler do Next fornece.
// Os testes continuam usando next/image real, com otimização e preload.
const require = createRequire(import.meta.url);
const { default: Image } = require("next/image.js") as typeof import("next/image");
const { ImageConfigContext } = require("next/dist/shared/lib/image-config-context.shared-runtime.js") as typeof import("next/dist/shared/lib/image-config-context.shared-runtime");
const { imageConfigDefault } = require("next/dist/shared/lib/image-config.js") as typeof import("next/dist/shared/lib/image-config");
const imageConfig = { ...imageConfigDefault, ...nextConfig.images };

export default function TestNextImage(props: ImageProps) {
  return <ImageConfigContext.Provider value={imageConfig}><Image {...props} alt={props.alt} /></ImageConfigContext.Provider>;
}
