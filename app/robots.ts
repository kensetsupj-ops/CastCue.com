import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo/metadata";

/**
 * robots.txt 自動生成
 *
 * 検索エンジンのクローラーに対して、クロール可能/不可能なパスを指定します。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/approve/",
          "/dashboard/",
          "/streams/",
          "/templates/",
          "/integrations/",
          "/reports/",
          "/settings/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/approve/",
          "/dashboard/",
          "/streams/",
          "/templates/",
          "/integrations/",
          "/reports/",
          "/settings/",
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
