import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Unicode TTF fonts with Cyrillic support (Noto Sans).
const FONT_REGULAR_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const FONT_BOLD_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

let cachedRegular: Uint8Array | null = null;
let cachedBold: Uint8Array | null = null;

async function fetchFont(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed ${res.status}: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("auth.getUser failed", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const caseId = body?.case_id;
    if (!caseId || typeof caseId !== "string") {
      return new Response(JSON.stringify({ error: "case_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: c, error: caseErr } = await admin
      .from("cases").select("*").eq("id", caseId).maybeSingle();
    if (caseErr || !c) {
      console.error("case fetch failed", caseErr);
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build PDF with Unicode (Cyrillic-capable) fonts.
    if (!cachedRegular) cachedRegular = await fetchFont(FONT_REGULAR_URL);
    if (!cachedBold) cachedBold = await fetchFont(FONT_BOLD_URL);

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(cachedRegular, { subset: true });
    const bold = await pdf.embedFont(cachedBold, { subset: true });

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 56;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 14;
    const bodySize = 11;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const wrap = (text: string, f: typeof font, size: number) => {
      const out: string[] = [];
      const paragraphs = (text || "").replace(/\r/g, "").split("\n");
      for (const para of paragraphs) {
        if (!para) { out.push(""); continue; }
        const words = para.split(/\s+/);
        let line = "";
        for (const w of words) {
          const trial = line ? line + " " + w : w;
          if (f.widthOfTextAtSize(trial, size) > maxWidth) {
            if (line) out.push(line);
            line = w;
          } else line = trial;
        }
        if (line) out.push(line);
      }
      return out;
    };

    const drawLine = (text: string, opts?: { f?: typeof font; size?: number; gap?: number }) => {
      const f = opts?.f ?? font;
      const size = opts?.size ?? bodySize;
      const gap = opts?.gap ?? lineHeight;
      if (y - gap < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(text ?? "", { x: margin, y: y - size, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= gap;
    };

    const drawBlock = (text: string, opts?: { f?: typeof font; size?: number }) => {
      const f = opts?.f ?? font;
      const size = opts?.size ?? bodySize;
      for (const ln of wrap(text, f, size)) drawLine(ln, { f, size });
    };

    // Header
    drawLine("Case Report", { f: bold, size: 22, gap: 30 });
    page.drawLine({
      start: { x: margin, y: y + 6 },
      end: { x: pageWidth - margin, y: y + 6 },
      thickness: 0.8,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 6;

    const meta: Array<[string, string]> = [
      ["Case ID", c.id],
      ["Client", c.client_name || "Not provided"],
      ["Language", c.language || "—"],
      ["Generated", new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"],
    ];
    for (const [k, v] of meta) {
      drawLine(`${k}: ${v}`, { size: 10, gap: 14 });
    }
    y -= 10;

    drawLine("Final Output", { f: bold, size: 14, gap: 22 });
    drawBlock(c.final_output || "(empty)", { size: bodySize });

    const bytes = await pdf.save();

    const path = `${c.id}/case-${c.id}-${Date.now()}.pdf`;
    const { error: upErr } = await admin.storage
      .from("case-pdfs")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Upload failed: ${upErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("case-pdfs")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: `Sign failed: ${signErr?.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin
      .from("cases").update({ pdf_url: signed.signedUrl }).eq("id", c.id);
    if (updErr) {
      return new Response(JSON.stringify({ error: `Update failed: ${updErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ pdf_url: signed.signedUrl, path }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-case-pdf failed", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});