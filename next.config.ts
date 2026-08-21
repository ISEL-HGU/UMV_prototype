import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Vercel 은 자체 출력 형식을 쓰므로 standalone 을 켜면 안 된다.
 * (Next 16 의 Turbopack 빌드와 겹치면 .nft.json 이 생성되지 않아 빌드가 깨진다)
 *
 * 샌드박스 서버에 직접 올릴 때만 켠다:
 *   BUILD_STANDALONE=true npm run build
 */
const standalone = process.env.BUILD_STANDALONE === "true";

const nextConfig: NextConfig = {
  ...(standalone ? { output: "standalone" as const } : {}),
};

export default withNextIntl(nextConfig);
