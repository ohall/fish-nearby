import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "Fish Nearby",
  description: "Explore public evidence about fish species in nearby waters.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f5ed",
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
