import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CoachingRequest {
  chatId: string;
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
      messageCount: body.messages?.length,
      hasAnalysis: !!body.analysis
    });

    const { chatId, messages, analysis }: CoachingRequest = body;

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

    const prompt = `Sen bir müşteri hizmetleri koçusun. Aşağıdaki chat görüşmesini analiz et ve destek personeline nasıl daha iyi cevap verebileceğine dair öneriler sun.

Chat:
${chatTranscript}

Mevcut Analiz:
- Duygu: ${sentimentText}
- Skor: ${scoreText}
- Sorunlar: ${issuesText}

Lütfen şu formatta coaching önerileri ver:

1. **Ana Sorun**: Konuşmadaki ana sorunu kısaca belirt
2. **Yapılması Gerekenler**: 3-4 madde halinde iyileştirme önerileri
3. **Örnek Cevap**: Bu durumda nasıl cevap verilmeli? Örnek bir cevap yaz (en fazla 2-3 cümle)

Türkçe, profesyonel ve yapıcı bir dille yaz.`;

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
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get coaching suggestions from Claude API" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const suggestion = data.content[0].text;

    return new Response(
      JSON.stringify({
        chatId,
        suggestion,
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
