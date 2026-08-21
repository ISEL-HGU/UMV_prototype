import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

/**
 * URL 에 로케일 세그먼트를 두지 않는 구성.
 * 경로가 / 와 /dashboard 로 유지되어 백엔드가 정적 파일을 서빙하기 쉽다.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
