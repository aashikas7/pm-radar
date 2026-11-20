import "./globals.css";
import { Instrument_Sans } from "next/font/google";
const f = Instrument_Sans({ subsets: ["latin"], display: "swap" });
export const metadata = { title: "PM Radar — APM & PM jobs: Remote India, Bengaluru, Worldwide", description: "Live APM and PM roles ranked by fit, with pay in ₹ LPA and HR contacts when posted." };
export default function RootLayout({ children }) {
  return <html lang="en"><body className={f.className}>{children}</body></html>;
}
