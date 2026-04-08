import { getCurrentMember } from "@/lib/auth";

export const runtime = "edge";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json({
    member: {
      id: member.id,
      name: member.name,
      color: member.color,
    },
  });
}
