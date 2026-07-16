import { InvestorShell } from "@/components/shells/InvestorShell";
import { InvestorSidebar } from "@/components/investor/InvestorSidebar";

export const metadata = {
  title: "Investor Portal | Relcko",
  description: "Manage your real estate investment portfolio, properties, and governance participation.",
};

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <InvestorShell sidebar={<InvestorSidebar />}>
      {children}
    </InvestorShell>
  );
}
