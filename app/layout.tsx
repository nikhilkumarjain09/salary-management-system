import type { Metadata } from "next";
import { CommandPaletteProvider } from "@/components/ui/CommandPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaySight — Employee Salary Management Software",
  description:
    "Manage pay data, compensation bands, ratios, and run natural-language organizational pay analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </body>
    </html>
  );
}
