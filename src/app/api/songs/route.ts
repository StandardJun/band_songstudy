import { createServerClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";

// GET /api/songs — list all songs with member info and comment count
export async function GET() {
  const supabase = createServerClient();

  const { data: songs, error } = await supabase
    .from("songs")
    .select(
      `
      *,
      member:members!uploaded_by(id, name, color),
      comments(count)
    `
    )
    .order("week_number", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Transform: flatten comment count
  const transformed = (songs || []).map((song) => ({
    ...song,
    comment_count:
      Array.isArray(song.comments) && song.comments[0]
        ? (song.comments[0] as { count: number }).count
        : 0,
    comments: undefined,
  }));

  return Response.json({ songs: transformed });
}

// POST /api/songs — upload a new song
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string;
    const weekNumber = formData.get("week_number") as string;

    if (!file || !title || !artist || !weekNumber) {
      return Response.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Upload file to Supabase Storage
    const ext = file.name.split(".").pop() || "mp3";
    const storagePath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("songs")
      .upload(storagePath, file, {
        contentType: file.type || "audio/mpeg",
      });

    if (uploadError) {
      return Response.json(
        { error: `업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Insert song record
    const { data: song, error: insertError } = await supabase
      .from("songs")
      .insert({
        title,
        artist,
        storage_path: storagePath,
        week_number: parseInt(weekNumber),
        uploaded_by: member.id,
      })
      .select()
      .single();

    if (insertError) {
      return Response.json(
        { error: `저장 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    return Response.json({ song }, { status: 201 });
  } catch {
    return Response.json({ error: "곡 업로드 실패" }, { status: 500 });
  }
}
