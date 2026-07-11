import type { Metadata } from "next";
import { CommandPaletteProvider } from "@/components/ui/CommandPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompensaIQIQ — Employee Salary Management Software",
  description:
    "Manage pay data, compensation bands, ratios, and run natural-language organizational pay analysis.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </body>
    </html>
  );
}
