import actions from "@/lib/actions";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { to, subject, html, text } = payload as any;
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "to and subject required" }),
        { status: 400 },
      );
    }

    const body = text || html || "";

    const result = await actions.send_email({ to, subject, body });

    if (!result || result.success === false) {
      return new Response(
        JSON.stringify({ success: false, error: result?.error ?? "failed" }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Failed to send email" }),
      { status: 500 },
    );
  }
}
