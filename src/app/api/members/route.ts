import { createServerClient } from "@/lib/supabase";

// GET /api/members — list member names and colors (public, for login page)
export async function GET() {
  const supabase = createServerClient();

  const { data: members, error } = await supabase
    .from("members")
    .select("id, name, color")
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ members: members || [] });
}
