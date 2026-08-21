import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /** 백엔드가 정적 파일로 서빙할 수 있도록 standalone 출력을 남긴다 */
  output: "standalone",
};

export default withNextIntl(nextConfig);
