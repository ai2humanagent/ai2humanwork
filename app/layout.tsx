import type { Metadata } from "next";
import "./globals.css";
import PrivyAppProvider from "./components/PrivyAppProvider";

export const metadata: Metadata = {
  title: "AI2Human — Task Execution Network For AI Agents",
  description:
    "AI2Human keeps AI agent tasks inside one auditable loop: planner precheck, human execution, structured proof, verification, and conditional settlement on Base.",
  other: {
    "virtual-protocol-site-verification": "bacbe8cc9ff3678b0185322d2139f085",
    "talentapp:project_verification": "f22007649642f206549b4efd93962c9b34c208c2663497df1e1d50391e975060b73e33cdb938b8706ec5b4bfc1b8a834a4a85b21e7ea8c58e32083a2b3a71a51"
  },
  icons: {
    icon: [
      { url: "/brand/ai2human-dual-arrow-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/ai2human-dual-arrow-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/ai2human-dual-arrow-256.png", sizes: "256x256", type: "image/png" }
    ],
    apple: [
      { url: "/brand/ai2human-dual-arrow-180.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyAppProvider>{children}</PrivyAppProvider>
      </body>
    </html>
  );
}
