import { createClient } from "@/lib/supabase/server";

export interface CurrentOrg {
  orgId:  string;
  role:   "owner" | "admin" | "member";
  orgName: string;
}

export async function getCurrentOrg(): Promise<CurrentOrg | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;

  const org = data.organizations as unknown as { name: string } | null;
  return { orgId: data.org_id, role: data.role as CurrentOrg["role"], orgName: org?.name ?? "" };
}
