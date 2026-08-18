import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

const deploymentHostname =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (deploymentHostname
      ? `https://${deploymentHostname}`
      : "http://localhost:3000"),
);

export const metadata: Metadata = {
  metadataBase,
  title: "Fish Nearby",
  applicationName: "Fish Nearby",
  description: "Find fish species in nearby public waters.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fish Nearby",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Fish Nearby",
    description: "Find fish anywhere.",
    siteName: "Fish Nearby",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fish Nearby",
    description: "Find fish anywhere.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#13231e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
