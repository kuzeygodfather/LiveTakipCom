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
    console.log("Creating supabase client...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Querying chats...");
    const { data: allChats, error: allError } = await supabase
      .from("chats")
      .select("*")
      .limit(5);

    console.log("All chats query result:", allChats?.length || 0, "error:", allError);

    const { data: archivedChats, error: archError } = await supabase
      .from("chats")
      .select("*")
      .eq("status", "archived")
      .limit(5);

    console.log("Archived chats query result:", archivedChats?.length || 0, "error:", archError);

    const { data: unanalyzedChats, error: unanalError } = await supabase
      .from("chats")
      .select("*")
      .eq("analyzed", false)
      .eq("status", "archived")
      .limit(5);

    console.log("Unanalyzed archived chats query result:", unanalyzedChats?.length || 0, "error:", unanalError);

    return new Response(
      JSON.stringify({
        success: true,
        all_chats: allChats?.length || 0,
        archived_chats: archivedChats?.length || 0,
        unanalyzed_chats: unanalyzedChats?.length || 0,
        sample_chat: allChats?.[0] || null,
        errors: {
          all: allError?.message || null,
          archived: archError?.message || null,
          unanalyzed: unanalError?.message || null,
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
