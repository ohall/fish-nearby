import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fish Nearby",
    short_name: "Fish Nearby",
    description: "Find fish species in nearby public waters.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#13231e",
    icons: [
      {
        src: "/brand/app-icon-cream-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/app-icon-cream-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/app-icon-cream-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
