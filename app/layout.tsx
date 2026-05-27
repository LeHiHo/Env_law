import type { ReactNode } from "react";

export const metadata = {
  title: "Environmental Law Backend",
  description: "Backend-only environmental law API",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
