import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pamuk Eller | Akıllı Finans",
    short_name: "Pamuk Eller",
    description: "Gelir, gider, bütçe, borç ve finansal hedeflerini tek merkezden yönet.",
    lang: "tr-TR",
    dir: "ltr",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f4ecd9",
    theme_color: "#d95743",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}