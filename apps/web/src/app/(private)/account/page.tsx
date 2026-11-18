import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-overview";
import { AccountSettings } from "@/components/account/account-settings";
import { requirePageUser } from "@/lib/auth/page-access";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requirePageUser();
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) parameters.append(name, item);
  return <AccountOverview user={user} favoriteParameters={parameters.toString()}><AccountSettings user={user} /></AccountOverview>;
}
