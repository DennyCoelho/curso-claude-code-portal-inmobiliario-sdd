import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-overview";
import { AccountSettings } from "@/components/account/account-settings";
import { requirePageUser } from "@/lib/auth/page-access";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requirePageUser();
  return <AccountOverview user={user}><AccountSettings user={user} /></AccountOverview>;
}
