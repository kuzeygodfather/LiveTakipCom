import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SCORE_THRESHOLD = 50;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      throw new Error("Telegram configuration not found");
    }

    const { data: unsentAlerts } = await supabase
      .from("alerts")
      .select(`
        *,
        chat_analysis(overall_score, sentiment)
      `)
      .eq("sent_to_telegram", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!unsentAlerts || unsentAlerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No alerts to send",
          sent: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const filteredAlerts = unsentAlerts.filter(alert => {
      const score = alert.chat_analysis?.overall_score;
      return typeof score === "number" && score < SCORE_THRESHOLD;
    });

    const skippedAlerts = unsentAlerts.filter(alert => {
      const score = alert.chat_analysis?.overall_score;
      return typeof score !== "number" || score >= SCORE_THRESHOLD;
    });

    if (skippedAlerts.length > 0) {
      const skippedIds = skippedAlerts.map(a => a.id);
      await supabase
        .from("alerts")
        .update({ sent_to_telegram: true })
        .in("id", skippedIds);
    }

    if (filteredAlerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `No alerts below score ${SCORE_THRESHOLD}`,
          sent: 0,
          skipped: skippedAlerts.length,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let sentCount = 0;

    for (const alert of filteredAlerts.slice(0, 10)) {
      const score = alert.chat_analysis?.overall_score ?? "?";
      const telegramUrl = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;

      const scoreEmoji = score < 30 ? "\u{1F534}" : score < 40 ? "\u{1F7E0}" : "\u{1F7E1}";

      const telegramResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: settings.telegram_chat_id,
          text: `${scoreEmoji} <b>Puan: ${score}/100</b>\n\n${alert.message}`,
          parse_mode: "HTML",
        }),
      });

      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();

        await supabase
          .from("alerts")
          .update({
            sent_to_telegram: true,
            telegram_message_id: telegramData.result?.message_id?.toString(),
          })
          .eq("id", alert.id);

        sentCount++;
      } else {
        console.error("Telegram API error:", await telegramResponse.text());
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped: skippedAlerts.length,
        threshold: SCORE_THRESHOLD,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Telegram alert error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
