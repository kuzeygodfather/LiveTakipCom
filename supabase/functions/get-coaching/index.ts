import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CoachingRequest {
  chatId: string;
  chatAnalysisId: string;
  customerName?: string;
  messages: Array<{
    author: { name: string };
    text: string;
  }>;
  analysis?: {
    sentiment: string;
    score: number;
    issues?: string[];
    summary?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Request body received:', {
      chatId: body.chatId,
      chatAnalysisId: body.chatAnalysisId,
      messageCount: body.messages?.length,
      hasAnalysis: !!body.analysis
    });

    const { chatId, chatAnalysisId, customerName, messages, analysis }: CoachingRequest = body;
    const firstName = customerName ? customerName.trim().split(/\s+/)[0] : '';

    if (!chatAnalysisId) {
      console.error('No chatAnalysisId provided');
      return new Response(
        JSON.stringify({ error: "chatAnalysisId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!messages || messages.length === 0) {
      console.error('No messages provided');
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("claude_api_key")
      .single();

    const ANTHROPIC_API_KEY = settings?.claude_api_key;
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Claude API key not configured in settings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const chatTranscript = messages
      .map((msg) => `${msg.author.name}: ${msg.text}`)
      .join("\n");

    const issuesText = analysis?.issues?.join(", ") || "bilinmiyor";
    const sentimentText = analysis?.sentiment || "olumsuz";
    const scoreText = analysis?.score || "düşük";

    const prompt = `Aşağıdaki müşteri hizmetleri chat görüşmesini incele ve destek personeline yönelik koçluk önerileri hazırla.

Chat:
${chatTranscript}

Mevcut Analiz:
- Duygu: ${sentimentText}
- Puan: ${scoreText}
- Sorunlar: ${issuesText}

Lütfen aşağıdaki formatta yaz:

1. **Ana Sorun**: Görüşmedeki temel sorunu açık ve net bir şekilde ifade et.
2. **Yapılması Gerekenler**: Personelin geliştirebileceği 3-4 somut öneriyi madde madde sırala.
3. **Örnek Cevap**: Bu durumda kullanılabilecek, doğal ve samimi bir örnek yanıt yaz (2-3 cümle).
4. **Örnek Diyalog**: Bu konuşmanın nasıl yapılması gerektiğini gösteren kısa bir örnek diyalog yaz. Üye'nin asıl şikayetine veya sorusuna odaklan ve doğru yaklaşımı göster. Tam olarak aşağıdaki formatı kullan (her satır yeni satırda, başka hiçbir şey ekleme):

DIYALOG_BASLANGIC
Üye: [müşterinin gerçek sorusuna/şikayetine uygun, doğal bir mesaj]
Temsilci: [empati kuran, çözüm odaklı, profesyonel yanıt]
Üye: [müşteri devam mesajı]
Temsilci: [sorunu çözen veya bir sonraki adımı anlatan yanıt]
DIYALOG_BITIS

Yazım kuralları:
- Cümleleri özne-yüklem sırasına göre kur; devrik cümle kullanma.
- Doğal, akıcı ve anlaşılır Türkçe kullan.
- Yargı bildiren cümleleri "-dır/-dir" yerine "-yor", "-meli" veya "-acak" ile bitir.
- Resmi ama samimi bir ton benimse.
- Diyalogda temsilci müşteriyi ismiyle hitap etsin${firstName ? ` (bu konuşmada müşterinin adı: ${firstName})` : ', örneğin "Ahmet Bey" veya "Ayşe Hanım" gibi'}. "Sayın Üye" gibi genel ifadeler kullanma.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        system: "Sen deneyimli bir müşteri hizmetleri koçusun. Türkçeyi akıcı, doğal ve devrik cümle içermeyecek şekilde kullanırsın. Özne-yüklem sırasına uyar, anlaşılır ve yapıcı bir dille yazarsın.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      let errorMessage = `Claude API hatası (${response.status})`;
      try {
        const errJson = JSON.parse(errorText);
        errorMessage = errJson.error?.message || errorMessage;
      } catch {}
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    if (!data.content || data.content.length === 0) {
      console.error("Claude API returned empty content:", data);
      return new Response(
        JSON.stringify({ error: "Claude API boş yanıt döndürdü" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const suggestion = data.content[0].text;

    // Save coaching suggestion to database (using service_role for UPDATE permission)
    console.log('Saving coaching suggestion to database:', {
      chatAnalysisId,
      suggestionLength: suggestion.length
    });

    const { data: updateData, error: updateError } = await supabase
      .from('chat_analysis')
      .update({ coaching_suggestion: suggestion })
      .eq('id', chatAnalysisId)
      .select();

    if (updateError) {
      console.error('Error saving coaching suggestion:', updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to save coaching suggestion to database",
          details: updateError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Coaching suggestion saved successfully:', {
      chatAnalysisId,
      rowsUpdated: updateData?.length
    });

    return new Response(
      JSON.stringify({
        chatId,
        chatAnalysisId,
        suggestion,
        saved: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-coaching function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
