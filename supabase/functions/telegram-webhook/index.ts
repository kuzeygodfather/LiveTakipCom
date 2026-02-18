import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELEGRAM_MSG_LIMIT = 4000;

function sanitizeText(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00A0]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripBotMention(text: string): string {
  return text.replace(/@\S+/g, "").trim();
}

function parseDate(text: string): { start: string; end: string; label: string } | null {
  const cleaned = sanitizeText(text);

  const fullDateMatch = cleaned.match(/^(\d{1,2})[.\-/\s](\d{1,2})[.\-/\s](\d{4})$/);
  if (fullDateMatch) {
    const day = fullDateMatch[1].padStart(2, "0");
    const month = fullDateMatch[2].padStart(2, "0");
    const year = fullDateMatch[3];
    return {
      start: `${year}-${month}-${day}T00:00:00+03:00`,
      end: `${year}-${month}-${day}T23:59:59+03:00`,
      label: `${day}.${month}.${year}`,
    };
  }

  const dayMonthMatch = cleaned.match(/^(\d{1,2})[.\-/\s](\d{1,2})\.?$/);
  if (dayMonthMatch) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const day = dayMonthMatch[1].padStart(2, "0");
    const month = dayMonthMatch[2].padStart(2, "0");
    const year = now.getFullYear();
    return {
      start: `${year}-${month}-${day}T00:00:00+03:00`,
      end: `${year}-${month}-${day}T23:59:59+03:00`,
      label: `${day}.${month}.${year}`,
    };
  }

  const dayOnlyMatch = cleaned.match(/^(\d{1,2})\.?$/);
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1]);
    if (day < 1 || day > 31) return null;
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const dayStr = String(day).padStart(2, "0");
    return {
      start: `${year}-${month}-${dayStr}T00:00:00+03:00`,
      end: `${year}-${month}-${dayStr}T23:59:59+03:00`,
      label: `${dayStr}.${month}.${year}`,
    };
  }

  if (/^b[uü]g[uü]n$/i.test(cleaned)) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return {
      start: `${year}-${month}-${day}T00:00:00+03:00`,
      end: `${year}-${month}-${day}T23:59:59+03:00`,
      label: `${day}.${month}.${year} (Bugun)`,
    };
  }

  if (/^d[uü]n$/i.test(cleaned)) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return {
      start: `${year}-${month}-${day}T00:00:00+03:00`,
      end: `${year}-${month}-${day}T23:59:59+03:00`,
      label: `${day}.${month}.${year} (Dun)`,
    };
  }

  return null;
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function sendSplitMessages(botToken: string, chatId: string, header: string, lines: string[]) {
  let current = header;
  for (const line of lines) {
    if (current.length + line.length + 2 > TELEGRAM_MSG_LIMIT) {
      await sendTelegramMessage(botToken, chatId, current);
      current = line;
    } else {
      current += "\n" + line;
    }
  }
  if (current) {
    await sendTelegramMessage(botToken, chatId, current);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("settings")
      .select("telegram_bot_token, telegram_chat_id")
      .limit(1)
      .maybeSingle();

    if (!settings?.telegram_bot_token) {
      throw new Error("Telegram not configured");
    }

    const body = await req.json();
    const message = body?.message;

    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id.toString();
    const rawText = message.text.trim();
    const withoutMention = stripBotMention(rawText);
    const withoutSlash = withoutMention.startsWith("/") ? withoutMention.slice(1) : withoutMention;
    const cleanedWithoutSlash = sanitizeText(withoutSlash);
    const isGroupChat = message.chat.type === "group" || message.chat.type === "supergroup";

    console.log("Received message:", JSON.stringify({ rawText, cleanedWithoutSlash, chatType: message.chat.type }));

    if (isGroupChat) {
      const isCommand = rawText.startsWith("/");
      const cleanedText = sanitizeText(withoutMention);
      const looksLikeDate = /^(\d{1,2}([.\-/]\d{1,2}([.\-/]\d{4})?)?\.?|b[uü]g[uü]n|d[uü]n)$/i.test(cleanedText);
      if (!isCommand && !looksLikeDate) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (cleanedWithoutSlash === "start" || cleanedWithoutSlash === "help") {
      await sendTelegramMessage(
        settings.telegram_bot_token,
        chatId,
        `<b>LiveChat Analiz Botu</b>\n\n` +
        `Tarih girerek o gune ait uyarilari gorebilirsiniz.\n\n` +
        `<b>Kullanim:</b>\n` +
        `- <code>12</code> - Bu ayin 12'si\n` +
        `- <code>12.02</code> - 12 Subat\n` +
        `- <code>12.02.2026</code> - Tam tarih\n` +
        `- <code>bugun</code> - Bugunun uyarilari\n` +
        `- <code>dun</code> - Dunun uyarilari\n` +
        `- <code>/ozet</code> - Bugunun ozeti\n` +
        `- <code>/chat CHATID</code> - Chat konusmasini goruntule\n` +
        `- <code>/help</code> - Bu yardim mesaji`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cleanedWithoutSlash === "ozet") {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayStart = `${year}-${month}-${day}T00:00:00+03:00`;
      const todayEnd = `${year}-${month}-${day}T23:59:59+03:00`;

      const { data: todayAnalysis } = await supabase
        .from("chat_analysis")
        .select("overall_score, sentiment")
        .gte("analysis_date", todayStart)
        .lte("analysis_date", todayEnd);

      const { count: totalChats } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      if (!todayAnalysis || todayAnalysis.length === 0) {
        await sendTelegramMessage(
          settings.telegram_bot_token,
          chatId,
          `\u{1F4CA} <b>Bugunun Ozeti (${day}.${month}.${year})</b>\n\nHenuz analiz edilmis sohbet yok.`
        );
      } else {
        const scores = todayAnalysis.map(a => a.overall_score);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const below50 = scores.filter(s => s < 60).length;
        const negativeCount = todayAnalysis.filter(a => a.sentiment === "negative").length;
        const positiveCount = todayAnalysis.filter(a => a.sentiment === "positive").length;

        await sendTelegramMessage(
          settings.telegram_bot_token,
          chatId,
          `\u{1F4CA} <b>Bugunun Ozeti (${day}.${month}.${year})</b>\n\n` +
          `\u{1F4AC} Toplam Sohbet: <b>${totalChats || 0}</b>\n` +
          `\u{2705} Analiz Edilen: <b>${todayAnalysis.length}</b>\n` +
          `\u{1F4AF} Ortalama Puan: <b>${avg}/100</b>\n` +
          `\u{1F534} 60 Alti: <b>${below50}</b>\n` +
          `\u{1F7E2} Pozitif: <b>${positiveCount}</b>\n` +
          `\u{1F534} Negatif: <b>${negativeCount}</b>`
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatCmdMatch = withoutSlash.match(/^chat\s+(.+)/i);
    if (chatCmdMatch) {
      const rawInputId = chatCmdMatch[1]
        .normalize("NFC")
        .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00A0\u0000-\u001F]/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();

      console.log("Chat lookup for:", JSON.stringify(rawInputId), "length:", rawInputId.length);

      const { data: rpcResults, error: rpcError } = await supabase
        .rpc("find_chat_by_id", { search_id: rawInputId });

      console.log("RPC result:", JSON.stringify(rpcResults), "error:", JSON.stringify(rpcError));

      const chatInfo = rpcResults && rpcResults.length > 0 ? rpcResults[0] : null;

      const targetChatId = rawInputId;

      if (!chatInfo) {
        await sendTelegramMessage(
          settings.telegram_bot_token,
          chatId,
          `Chat bulunamadi: <code>${escapeHtml(targetChatId)}</code>\n<i>(${rawInputId.length} karakter, v3)</i>`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use the thread ID (id) to fetch messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("text, author_type, created_at, is_system")
        .eq("chat_id", chatInfo.id)
        .order("created_at", { ascending: true })
        .limit(200);

      const chatDate = new Date(chatInfo.created_at).toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const header =
        `\u{1F4AC} <b>Chat Detayi</b>\n\n` +
        `<b>Chat ID:</b> <code>${chatInfo.id}</code>\n` +
        `<b>Temsilci:</b> ${chatInfo.agent_name || "Bilinmiyor"}\n` +
        `<b>Musteri:</b> ${chatInfo.customer_name || "Bilinmiyor"}\n` +
        `<b>Tarih:</b> ${chatDate}\n` +
        `<b>Mesaj Sayisi:</b> ${chatInfo.message_count || messages?.length || 0}\n\n` +
        `<b>--- Konusma ---</b>\n`;

      if (!messages || messages.length === 0) {
        await sendTelegramMessage(
          settings.telegram_bot_token,
          chatId,
          header + "\nMesaj bulunamadi."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msgLines = messages.map(msg => {
        const time = new Date(msg.created_at).toLocaleTimeString("tr-TR", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
          minute: "2-digit",
        });
        const safeText = escapeHtml((msg.text || "").trim());
        if (msg.is_system) {
          return `\u{2699}\u{FE0F} [${time}] <i>${safeText.substring(0, 200)}</i>`;
        }
        const role = msg.author_type === "agent" ? "\u{1F464}" : "\u{1F9D1}";
        const label = msg.author_type === "agent" ? "Temsilci" : "Musteri";
        return `${role} [${time}] <b>${label}:</b> ${safeText.substring(0, 300)}`;
      });

      await sendSplitMessages(settings.telegram_bot_token, chatId, header, msgLines);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateRange = parseDate(withoutSlash);

    if (!dateRange) {
      await sendTelegramMessage(
        settings.telegram_bot_token,
        chatId,
        `Gecersiz format. Tarih girin:\n<code>12</code>, <code>12.02</code>, <code>bugun</code>, <code>dun</code>\n\n` +
        `Chat goruntule: <code>/chat CHATID</code>\n` +
        `Yardim icin /help yazin.`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dateAnalysis } = await supabase
      .from("chat_analysis")
      .select("id, chat_id, overall_score, sentiment, ai_summary, analysis_date, chats(agent_name)")
      .gte("analysis_date", dateRange.start)
      .lte("analysis_date", dateRange.end)
      .order("analysis_date", { ascending: false });

    if (!dateAnalysis || dateAnalysis.length === 0) {
      await sendTelegramMessage(
        settings.telegram_bot_token,
        chatId,
        `\u{1F4C5} <b>${dateRange.label}</b>\n\nBu tarihte analiz bulunamadi.`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allScores = dateAnalysis.map(a => a.overall_score).filter(Boolean);
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
      : 0;
    const below50 = allScores.filter((s: number) => s < 60).length;
    const failedAnalyses = dateAnalysis.filter(a => a.overall_score !== null && a.overall_score < 60);

    if (failedAnalyses.length === 0) {
      await sendTelegramMessage(
        settings.telegram_bot_token,
        chatId,
        `\u{1F4C5} <b>${dateRange.label} - Rapor</b>\n\n` +
        `\u{1F4CA} Toplam Analiz: <b>${allScores.length}</b>\n` +
        `\u{1F4AF} Ort. Puan: <b>${avgScore}/100</b>\n` +
        `\u{2705} 60 alti uyari yok!`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const header =
      `\u{1F4C5} <b>${dateRange.label} - Uyari Raporu</b>\n\n` +
      `\u{1F4CA} Toplam Analiz: <b>${allScores.length}</b>\n` +
      `\u{1F4AF} Ort. Puan: <b>${avgScore}/100</b>\n` +
      `\u{1F534} 60 Alti: <b>${below50}</b>\n\n` +
      `<b>--- Olumsuz Chatler (60 Alti) ---</b>\n`;

    const alertLines = failedAnalyses.map((analysis: any, i: number) => {
      const score = analysis.overall_score ?? "?";
      const summary = analysis.ai_summary || "";
      const agentName = (analysis.chats as any)?.agent_name || "?";
      const time = new Date(analysis.analysis_date).toLocaleTimeString("tr-TR", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
      });
      const sevIcon = score < 30 ? "\u{1F534}" : score < 40 ? "\u{1F7E0}" : "\u{1F7E1}";

      return (
        `${sevIcon} <b>#${i + 1}</b> [${time}] Puan: <b>${score}/100</b>\n` +
        `\u{1F464} ${agentName} | \u{1F4AC} <code>${analysis.chat_id || "?"}</code>\n` +
        `${summary ? summary.substring(0, 120) : "Detay yok"}\n`
      );
    });

    await sendSplitMessages(settings.telegram_bot_token, chatId, header, alertLines);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
