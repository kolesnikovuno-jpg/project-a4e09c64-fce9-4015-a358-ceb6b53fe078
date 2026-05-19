import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Unicode TTF fonts with Cyrillic support.
// Body: Noto Sans (editorial sans). Display: Montserrat (geometric).
const FONT_BODY_REGULAR_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const FONT_BODY_BOLD_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-SemiBold.ttf";
const FONT_BODY_ITALIC_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Italic.ttf";
const FONT_DISPLAY_URL =
  "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Medium.ttf";

const cachedFonts: Record<string, Uint8Array> = {};

async function fetchFont(url: string): Promise<Uint8Array> {
  if (cachedFonts[url]) return cachedFonts[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed ${res.status}: ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  cachedFonts[url] = bytes;
  return bytes;
}

// ---------- Markdown parsing ----------
type Inline = { text: string; bold?: boolean; italic?: boolean };
type Block =
  | { kind: "h1" | "h2" | "h3"; inlines: Inline[] }
  | { kind: "p"; inlines: Inline[] }
  | { kind: "li"; inlines: Inline[]; ordered?: boolean; index?: number }
  | { kind: "hr" }
  | { kind: "space" };

function parseInlines(raw: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push({ text: raw.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ text: m[2], bold: true });
    else if (m[4] !== undefined) out.push({ text: m[4], italic: true });
    else if (m[6] !== undefined) out.push({ text: m[6], italic: true });
    last = re.lastIndex;
  }
  if (last < raw.length) out.push({ text: raw.slice(last) });
  return out.length ? out : [{ text: raw }];
}

function parseMarkdown(src: string): Block[] {
  const lines = (src || "").replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let orderedIndex = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", inlines: parseInlines(para.join(" ").trim()) });
      para = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushPara();
      orderedIndex = 0;
      if (blocks[blocks.length - 1]?.kind !== "space") blocks.push({ kind: "space" });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      blocks.push({ kind: "hr" });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      const lvl = h[1].length as 1 | 2 | 3;
      blocks.push({ kind: lvl === 1 ? "h1" : lvl === 2 ? "h2" : "h3", inlines: parseInlines(h[2]) });
      continue;
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      flushPara();
      blocks.push({ kind: "li", inlines: parseInlines(ul[1]) });
      continue;
    }
    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ol) {
      flushPara();
      orderedIndex += 1;
      blocks.push({ kind: "li", inlines: parseInlines(ol[2]), ordered: true, index: orderedIndex });
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

function formatHumanDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function shortRef(id: string): string {
  const digits = (id.match(/\d/g) || []).join("");
  const tail = digits.slice(-4) || id.replace(/-/g, "").slice(-4).toUpperCase();
  return `SC-${tail}`;
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

    const finalOutput = (c.final_output || "").trim();
    if (!finalOutput) {
      return new Response(
        JSON.stringify({ error: "Final output is empty. Add client response before generating PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load fonts
    const [bodyReg, bodyBold, bodyItalic, display] = await Promise.all([
      fetchFont(FONT_BODY_REGULAR_URL),
      fetchFont(FONT_BODY_BOLD_URL),
      fetchFont(FONT_BODY_ITALIC_URL),
      fetchFont(FONT_DISPLAY_URL),
    ]);

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fRegular = await pdf.embedFont(bodyReg, { subset: true });
    const fBold = await pdf.embedFont(bodyBold, { subset: true });
    const fItalic = await pdf.embedFont(bodyItalic, { subset: true });
    const fDisplay = await pdf.embedFont(display, { subset: true });

    // A4 portrait, generous editorial margins
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 84; // ~30mm
    const marginTop = 96;
    const marginBottom = 96;
    const contentWidth = pageWidth - marginX * 2;

    const ink = rgb(0.11, 0.11, 0.12);
    const muted = rgb(0.46, 0.46, 0.48);
    const faint = rgb(0.78, 0.78, 0.80);

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - marginTop;

    const fontFor = (inl: Inline, base: typeof fRegular = fRegular) => {
      if (inl.bold) return fBold;
      if (inl.italic) return fItalic;
      return base;
    };

    const newPage = () => {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    };

    const ensureSpace = (needed: number) => {
      if (y - needed < marginBottom) newPage();
    };

    // Wrap inlines into visual lines, respecting per-segment fonts.
    const wrapInlines = (
      inlines: Inline[],
      size: number,
      baseFont: typeof fRegular,
      width: number,
    ): Inline[][] => {
      const lines: Inline[][] = [[]];
      const pushWord = (word: string, src: Inline) => {
        const cur = lines[lines.length - 1];
        const f = fontFor(src, baseFont);
        const trialWidth = cur.reduce(
          (w, seg) => w + fontFor(seg, baseFont).widthOfTextAtSize(seg.text, size),
          0,
        );
        const sep = cur.length && !/^\s/.test(word) && !cur[cur.length - 1].text.endsWith(" ") ? " " : "";
        const wWidth = f.widthOfTextAtSize(sep + word, size);
        if (cur.length && trialWidth + wWidth > width) {
          lines.push([{ ...src, text: word }]);
        } else {
          if (sep) {
            const lastSeg = cur[cur.length - 1];
            if (lastSeg && lastSeg.bold === src.bold && lastSeg.italic === src.italic) {
              lastSeg.text += " " + word;
            } else {
              cur.push({ ...src, text: " " + word });
            }
          } else {
            cur.push({ ...src, text: word });
          }
        }
      };

      for (const seg of inlines) {
        const words = seg.text.split(/(\s+)/).filter((s) => s.length);
        for (const w of words) {
          if (/^\s+$/.test(w)) continue;
          pushWord(w, seg);
        }
      }
      return lines.filter((l) => l.length);
    };

    const drawInlineLine = (
      segs: Inline[],
      x: number,
      yPos: number,
      size: number,
      baseFont: typeof fRegular,
      color = ink,
    ) => {
      let cx = x;
      for (const seg of segs) {
        const f = fontFor(seg, baseFont);
        const text = seg.text.replace(/^\s+/, cx === x ? "" : " ");
        page.drawText(text, { x: cx, y: yPos, size, font: f, color });
        cx += f.widthOfTextAtSize(text, size);
      }
    };

    const drawBlock = (b: Block) => {
      if (b.kind === "space") { y -= 6; return; }
      if (b.kind === "hr") {
        ensureSpace(20);
        y -= 8;
        page.drawLine({
          start: { x: marginX, y },
          end: { x: pageWidth - marginX, y },
          thickness: 0.5,
          color: faint,
        });
        y -= 14;
        return;
      }

      let size = 10.5;
      let lineH = 16;
      let baseFont = fRegular;
      let topGap = 0;
      let bottomGap = 6;
      let indent = 0;
      let prefix = "";

      if (b.kind === "h1") { size = 18; lineH = 24; baseFont = fDisplay; topGap = 18; bottomGap = 10; }
      else if (b.kind === "h2") { size = 14; lineH = 20; baseFont = fDisplay; topGap = 16; bottomGap = 8; }
      else if (b.kind === "h3") { size = 11.5; lineH = 17; baseFont = fBold; topGap = 12; bottomGap = 6; }
      else if (b.kind === "li") {
        indent = 18;
        prefix = b.ordered ? `${b.index}.` : "—";
        bottomGap = 4;
      }

      y -= topGap;
      const width = contentWidth - indent;
      const lines = wrapInlines(b.inlines, size, baseFont, width);

      for (let i = 0; i < lines.length; i++) {
        ensureSpace(lineH);
        const baselineY = y - size;
        if (i === 0 && prefix) {
          page.drawText(prefix, {
            x: marginX,
            y: baselineY,
            size,
            font: fRegular,
            color: muted,
          });
        }
        drawInlineLine(lines[i], marginX + indent, baselineY, size, baseFont);
        y -= lineH;
      }
      y -= bottomGap;
    };

    // ---------- HEADER ----------
    // Eyebrow
    const eyebrow = "STRUCTURAL CLARITY";
    page.drawText(eyebrow, {
      x: marginX,
      y: y - 9,
      size: 9,
      font: fDisplay,
      color: muted,
    });
    // letter spacing approximation by drawing — pdf-lib lacks tracking, so we accept default
    y -= 28;

    // Title
    const title = "Structural Diagnostic Response";
    page.drawText(title, {
      x: marginX,
      y: y - 22,
      size: 22,
      font: fDisplay,
      color: ink,
    });
    y -= 44;

    // Hairline
    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 0.5,
      color: faint,
    });
    y -= 22;

    // Metadata block
    const clientName = (c.client_name || "").trim() || "Private Client";
    const meta: Array<[string, string]> = [
      ["Prepared for", clientName],
      ["Reference", shortRef(c.id)],
      ["Date", formatHumanDate(c.created_at) || formatHumanDate(new Date().toISOString())],
    ];
    for (const [k, v] of meta) {
      ensureSpace(16);
      page.drawText(k.toUpperCase(), {
        x: marginX, y: y - 9, size: 8, font: fDisplay, color: muted,
      });
      page.drawText(v, {
        x: marginX + 110, y: y - 9, size: 10.5, font: fRegular, color: ink,
      });
      y -= 18;
    }

    y -= 36;

    // ---------- BODY ----------
    const blocks = parseMarkdown(finalOutput);
    // collapse leading empty
    while (blocks.length && blocks[0].kind === "space") blocks.shift();
    for (const b of blocks) drawBlock(b);

    // ---------- FOOTER ----------
    const pages = pdf.getPages();
    pages.forEach((p) => {
      p.drawText("Structural Clarity  ·  Confidential Expert Response", {
        x: marginX,
        y: 48,
        size: 7.5,
        font: fDisplay,
        color: muted,
      });
    });

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