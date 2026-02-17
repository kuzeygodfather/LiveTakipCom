import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  author_type: string;
  text: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== Starting analyze-chat function ===");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Fetching settings...");
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings error:", settingsError);
      throw new Error(`Settings error: ${settingsError.message}`);
    }

    console.log("Settings loaded, has Claude key:", !!settings?.claude_api_key);

    if (!settings?.claude_api_key) {
      throw new Error("Claude API key not configured");
    }

    console.log("Fetching unanalyzed chats...");

    // First, let's check total chats
    const { count: totalCount } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true });
    console.log("Total chats in database:", totalCount);

    // Check archived chats
    const { count: archivedCount } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("status", "archived");
    console.log("Archived chats:", archivedCount);

    // Check unanalyzed
    const { count: unanalyzedCount } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("analyzed", false);
    console.log("Unanalyzed chats:", unanalyzedCount);

    const { data: unanalyzedChats, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .eq("analyzed", false)
      .limit(50);

    console.log("Unanalyzed chats found with query:", unanalyzedChats?.length || 0);
    if (chatsError) {
      console.error("Error fetching chats:", chatsError);
      throw new Error(`Database error: ${chatsError.message}`);
    }

    if (!unanalyzedChats || unanalyzedChats.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No chats to analyze",
          analyzed: 0,
          debug: {
            totalCount,
            archivedCount,
            unanalyzedCount,
            chatsLength: unanalyzedChats?.length || 0,
          }
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let analyzedCount = 0;
    let alertsCreated = 0;
    const errors: string[] = [];

    console.log(`Starting to process ${unanalyzedChats.length} chats`);
    console.log("Chat IDs:", unanalyzedChats.map(c => c.id).join(", "));

    for (const chat of unanalyzedChats) {
      console.log(`\n=== Analyzing chat ${chat.id} ===`);
      console.log(`Agent: ${chat.agent_name}, Customer: ${chat.customer_name}`);

      try {
        const { data: messages, error: msgError } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_id", chat.id)
          .eq("is_system", false)
          .order("created_at", { ascending: true });

        console.log(`Messages found: ${messages?.length || 0}`);
        if (msgError) {
          console.error("Error fetching messages:", msgError);
          throw msgError;
        }

        if (!messages || messages.length === 0) {
          console.log("No messages, marking as analyzed");
          await supabase
            .from("chats")
            .update({ analyzed: true })
            .eq("id", chat.id);
          continue;
        }

        // Calculate first response time
        let firstResponseTime = null;
        let avgResponseTime = null;
        const responseTimes: number[] = [];

        for (let i = 0; i < messages.length - 1; i++) {
          const currentMsg = messages[i];
          const nextMsg = messages[i + 1];

          // Find customer message followed by agent response
          if (currentMsg.author_type === "customer" && nextMsg.author_type === "agent") {
            const responseTime = new Date(nextMsg.created_at).getTime() - new Date(currentMsg.created_at).getTime();
            const responseSeconds = Math.round(responseTime / 1000);
            responseTimes.push(responseSeconds);

            // Set first response time if not set
            if (firstResponseTime === null) {
              firstResponseTime = responseSeconds;
            }
          }
        }

        if (responseTimes.length > 0) {
          avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
        }

        const conversationText = messages
          .map((m: Message) => `${m.author_type === "agent" ? "Temsilci" : "Müşteri"}: ${m.text}`)
          .join("\n");

        console.log(`Conversation text length: ${conversationText.length}`);
        console.log(`First response time: ${firstResponseTime} seconds`);
        console.log(`Average response time: ${avgResponseTime} seconds`);
        console.log("Calling Claude API...");

        const analysisPrompt = `Aşağıdaki müşteri hizmetleri sohbetini detaylı analiz et ve JSON formatında yanıt ver.

SOHBET:
${conversationText}

Temsilci: ${chat.agent_name}
Müşteri: ${chat.customer_name}
İlk Yanıt Süresi: ${firstResponseTime !== null ? `${firstResponseTime} saniye` : 'Hesaplanamadı'}
Ortalama Yanıt Süresi: ${avgResponseTime !== null ? `${avgResponseTime} saniye` : 'Hesaplanamadı'}

Aşağıdaki kriterlere göre analiz yap:

1. DİL VE ÜSLUP UYUM DENETİMİ:
- Profesyonel dil kullanımı (0-100 puan)
- Saygılı ve kibar üslup (0-100 puan)
- Yasaklı veya uygunsuz kelime kullanımı (varsa listele)
- Kopyala-yapıştır / ezber mesaj tespiti (var/yok)

2. CHAT KALİTE DENETİMİ:
- Soruya gerçek cevap verildi mi? (0-100 puan)
- Oyalama, geçiştirme tespit edildi mi? (var/yok)
- Gereksiz uzatma veya kısa kesme (var/yok)
- Müşteri memnuniyetine etkisi (pozitif/nötr/negatif)

3. PERFORMANS METRİKLERİ:
- İlk yanıt kalitesi (0-100 puan)
- Çözüm odaklılık (0-100 puan)
- İletişim etkinliği (0-100 puan)

4. TESPIT EDİLEN SORUNLAR:
- Kritik hatalar (varsa)
- Geliştirilmesi gereken alanlar
- Eksik bilgi veya yanlış yönlendirme

5. POZİTİF YÖNLER:
- İyi yapılan şeyler
- Güçlü yönler

JSON formatı:
{
  "overall_score": 0-100,
  "language_compliance": {
    "professional_language": 0-100,
    "polite_tone": 0-100,
    "forbidden_words": [],
    "copy_paste_detected": false
  },
  "quality_metrics": {
    "answer_relevance": 0-100,
    "stalling_detected": false,
    "unnecessary_length": false,
    "customer_satisfaction": "positive|neutral|negative"
  },
  "performance_metrics": {
    "first_response_quality": 0-100,
    "solution_focused": 0-100,
    "communication_effectiveness": 0-100
  },
  "issues_detected": {
    "critical_errors": [],
    "improvement_areas": [],
    "misinformation": []
  },
  "positive_aspects": {
    "strengths": [],
    "good_practices": []
  },
  "recommendations": "Detaylı öneriler",
  "sentiment": "positive|neutral|negative",
  "requires_attention": true|false,
  "ai_summary": "Kısa özet"
}`;

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.claude_api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4096,
          temperature: 0.3,
          system: "Sen müşteri hizmetleri kalite kontrol uzmanısın. Sohbetleri detaylı analiz eder ve JSON formatında rapor verirsin. Sadece geçerli JSON döndür, başka bir şey yazma.",
          messages: [
            {
              role: "user",
              content: analysisPrompt,
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        console.error("Claude API error:", await claudeResponse.text());
        continue;
      }

      const claudeData = await claudeResponse.json();
      const analysisResult = JSON.parse(claudeData.content[0].text);

      const { data: analysisRecord, error: analysisError } = await supabase
        .from("chat_analysis")
        .insert({
          chat_id: chat.id,
          overall_score: analysisResult.overall_score,
          language_compliance: analysisResult.language_compliance,
          quality_metrics: analysisResult.quality_metrics,
          performance_metrics: analysisResult.performance_metrics,
          issues_detected: analysisResult.issues_detected,
          positive_aspects: analysisResult.positive_aspects,
          recommendations: analysisResult.recommendations,
          sentiment: analysisResult.sentiment,
          requires_attention: analysisResult.requires_attention,
          ai_summary: analysisResult.ai_summary,
        })
        .select()
        .single();

      if (analysisError) {
        console.error("Analysis insert error:", analysisError);
        continue;
      }

      await supabase
        .from("chats")
        .update({
          analyzed: true,
          first_response_time: firstResponseTime
        })
        .eq("id", chat.id);

      // Create alert for low scores OR negative sentiment
      if (analysisResult.overall_score < 50 || analysisResult.sentiment === "negative") {
        const severity = analysisResult.overall_score < 30 ? "critical" : "high";

        const chatDate = new Date(chat.created_at).toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const alertMessage = `🚨 DİKKAT GEREKTİREN SOHBET

Chat ID: ${chat.id}
Tarih: ${chatDate}
Temsilci: ${chat.agent_name}
Müşteri: ${chat.customer_name}
Genel Puan: ${analysisResult.overall_score}/100
Durum: ${analysisResult.sentiment === "negative" ? "Olumsuz" : analysisResult.sentiment === "positive" ? "Olumlu" : "Nötr"}

📊 Özet:
${analysisResult.ai_summary}

⚠️ Tespit Edilen Sorunlar:
${analysisResult.issues_detected.critical_errors?.join("\n") || "Yok"}
${analysisResult.issues_detected.improvement_areas?.join("\n") || ""}

💡 Öneriler:
${analysisResult.recommendations}`;

        await supabase.from("alerts").insert({
          chat_id: chat.id,
          analysis_id: analysisRecord.id,
          alert_type: "quality_issue",
          severity: severity,
          message: alertMessage,
          sent_to_telegram: false,
        });

        alertsCreated++;
      }

        const today = new Date().toISOString().split("T")[0];
        await supabase.rpc("upsert_daily_stats", {
          p_personnel_name: chat.agent_name,
          p_date: today,
          p_score: analysisResult.overall_score,
          p_response_time: chat.first_response_time || 0,
        });

        analyzedCount++;
        console.log(`Successfully analyzed chat ${chat.id}`);
      } catch (chatError) {
        console.error(`Error analyzing chat ${chat.id}:`, chatError);
        errors.push(`${chat.id}: ${chatError.message}`);
        continue;
      }
    }

    console.log(`\n=== Analysis Complete ===`);
    console.log(`Total analyzed: ${analyzedCount}`);
    console.log(`Alerts created: ${alertsCreated}`);
    console.log(`Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: analyzedCount,
        alerts_created: alertsCreated,
        errors: errors.length > 0 ? errors : undefined,
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
    console.error("Analysis error:", error);
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
