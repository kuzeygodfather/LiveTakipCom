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

    const { chatId } = await req.json().catch(() => ({}));

    if (chatId) {
      const { error: delError } = await supabase
        .from("chat_analysis")
        .delete()
        .eq("chat_id", chatId);

      if (delError) throw new Error(`Delete analysis error: ${delError.message}`);

      const { error: updateError } = await supabase
        .from("chats")
        .update({ analyzed: false })
        .eq("id", chatId);

      if (updateError) throw new Error(`Update chat error: ${updateError.message}`);

      return new Response(
        JSON.stringify({ success: true, message: "Single chat reset complete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: delError } = await supabase
      .from("chat_analysis")
      .delete()
      .not("id", "is", null);

    if (delError) throw new Error(`Delete all analyses error: ${delError.message}`);

    const { error: updateError } = await supabase
      .from("chats")
      .update({ analyzed: false })
      .not("id", "is", null);

    if (updateError) throw new Error(`Update all chats error: ${updateError.message}`);

    return new Response(
      JSON.stringify({ success: true, message: "All analyses reset complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
