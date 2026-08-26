import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holmberg Homies 2026",
  description:
    "Sign up, vote on the partner format, and follow the Holmberg Homies 2026 pickleball tournament at Holmberg Park in Spokane.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
