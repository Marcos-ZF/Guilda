import type { Metadata } from "next";
import LogoutTransition from "./components/LogoutTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Companhia Romanov | Arquivo Institucional",
  description: "Arquivo público da Companhia Romanov: história, funcionários, feitos e relatórios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <LogoutTransition />
      </body>
    </html>
  );
}
