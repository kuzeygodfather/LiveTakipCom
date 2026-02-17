import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      .select("livechat_api_key")
      .limit(1)
      .maybeSingle();

    if (!settings?.livechat_api_key) {
      throw new Error("LiveChat API key not found");
    }

    const startDate = "2026-02-14T00:00:00.000Z";
    const endDate = "2026-02-15T00:00:00.000Z";

    console.log(`Fetching LiveChat data for Feb 14...`);

    const page1Response = await fetch(
      `https://livechat.systemtest.store/api/v1/chats?page=1&per_page=100&start_date=${startDate}&end_date=${endDate}&date_field=created_at`,
      { headers: { "X-API-Key": settings.livechat_api_key } }
    );

    if (!page1Response.ok) {
      throw new Error(`LiveChat API error: ${page1Response.statusText}`);
    }

    const page1Data = await page1Response.json();
    const page1Chats = page1Data.data || [];

    const page2Response = await fetch(
      `https://livechat.systemtest.store/api/v1/chats?page=2&per_page=100&start_date=${startDate}&end_date=${endDate}&date_field=created_at`,
      { headers: { "X-API-Key": settings.livechat_api_key } }
    );

    const page2Data = await page2Response.json();
    const page2Chats = page2Data.data || [];

    const firstChatPage1 = page1Chats[0];
    const lastChatPage1 = page1Chats[page1Chats.length - 1];
    const firstChatPage2 = page2Chats[0];

    return new Response(
      JSON.stringify({
        success: true,
        page1: {
          total: page1Chats.length,
          pagination: page1Data.pagination,
          first_chat: {
            id: firstChatPage1?.id,
            created_at: firstChatPage1?.created_at,
            agent: firstChatPage1?.agent_name,
            customer: firstChatPage1?.customer_name,
          },
          last_chat: {
            id: lastChatPage1?.id,
            created_at: lastChatPage1?.created_at,
            agent: lastChatPage1?.agent_name,
            customer: lastChatPage1?.customer_name,
          }
        },
        page2: {
          total: page2Chats.length,
          pagination: page2Data.pagination,
          first_chat: {
            id: firstChatPage2?.id,
            created_at: firstChatPage2?.created_at,
            agent: firstChatPage2?.agent_name,
            customer: firstChatPage2?.customer_name,
          }
        },
        analysis: {
          note: "Check if Page 1 starts with newest or oldest chats"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
