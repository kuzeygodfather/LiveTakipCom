import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, delayMs = 1000): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Fetching ${url}`);
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const waitTime = delayMs * attempt;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("=== Sync LiveChat Function Started ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log("Supabase URL:", supabaseUrl ? "SET" : "NOT SET");
    console.log("Supabase Key:", supabaseKey ? "SET" : "NOT SET");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for background mode
    const url = new URL(req.url);
    const backgroundMode = url.searchParams.get("background") === "true";
    const jobId = url.searchParams.get("job_id");

    // If background mode is requested and no job_id, create job and trigger async
    if (backgroundMode && !jobId) {
      console.log("=== Background Mode: Creating Job ===");

      const startParam = url.searchParams.get("start_date");
      const endParam = url.searchParams.get("end_date");
      const daysParam = url.searchParams.get("days");

      let startDate: string;
      let endDate: string;
      let days: number | null = null;

      if (startParam && endParam) {
        startDate = new Date(startParam).toISOString();
        endDate = new Date(endParam).toISOString();
      } else if (daysParam) {
        days = parseInt(daysParam, 10);
        const now = new Date();
        startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString();
        endDate = now.toISOString();
      } else {
        days = 7;
        const now = new Date();
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
        endDate = now.toISOString();
      }

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from("sync_jobs")
        .insert({
          status: "pending",
          start_date: startDate,
          end_date: endDate,
          days: days,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(`Failed to create job: ${jobError?.message}`);
      }

      console.log(`Job created: ${job.id}`);

      // Trigger async processing by calling self without background param
      const asyncUrl = new URL(req.url);
      asyncUrl.searchParams.delete("background");
      asyncUrl.searchParams.set("job_id", job.id);

      // Fire and forget - don't await
      fetch(asyncUrl.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      }).catch(err => console.error("Failed to trigger async job:", err));

      // Return immediately with job ID
      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          status: "pending",
          message: "Sync job created and processing in background"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update job status to processing if job_id provided
    if (jobId) {
      console.log(`=== Processing Job: ${jobId} ===`);
      await supabase
        .from("sync_jobs")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    console.log("Fetching settings from database...");
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    console.log("Settings fetched:", settings ? "YES" : "NO");
    if (settingsError) {
      console.error("Settings error:", settingsError);
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    if (!settings?.livechat_api_key) {
      throw new Error("LiveChat API key not configured in settings table");
    }

    console.log("LiveChat API key status:", settings.livechat_api_key ? "SET" : "NOT SET");

    let startDate: string;
    let endDate: string;

    try {
      const url = new URL(req.url);
      const startParam = url.searchParams.get("start_date");
      const endParam = url.searchParams.get("end_date");
      const daysParam = url.searchParams.get("days");

      if (startParam && endParam) {
        startDate = new Date(startParam).toISOString();
        endDate = new Date(endParam).toISOString();
      } else if (daysParam) {
        const daysToFetch = parseInt(daysParam, 10);
        if (!isNaN(daysToFetch) && daysToFetch > 0 && daysToFetch <= 90) {
          const now = new Date();
          startDate = new Date(now.getTime() - (daysToFetch * 24 * 60 * 60 * 1000)).toISOString();
          endDate = now.toISOString();
        } else {
          throw new Error("Invalid days parameter");
        }
      } else {
        const now = new Date();
        startDate = new Date(now.getTime() - (20 * 60 * 1000)).toISOString();
        endDate = now.toISOString();
      }
    } catch (e) {
      const now = new Date();
      startDate = new Date(now.getTime() - (20 * 60 * 1000)).toISOString();
      endDate = now.toISOString();
    }

    // CRITICAL: LiveChat API expects dates in Istanbul timezone (UTC+3), not UTC
    // Convert UTC dates to Istanbul timezone for API request
    const istanbulOffset = 3 * 60 * 60 * 1000; // UTC+3
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    const startDateIstanbul = new Date(startDateUTC.getTime() + istanbulOffset).toISOString();
    const endDateIstanbul = new Date(endDateUTC.getTime() + istanbulOffset).toISOString();

    // For logging
    const istanbulNow = new Date(new Date().getTime() + istanbulOffset);
    const istanbulStartDate = new Date(startDateUTC.getTime() + istanbulOffset);
    const istanbulEndDate = new Date(endDateUTC.getTime() + istanbulOffset);

    console.log(`Fetching chats from ${startDate} to ${endDate}`);
    console.log(`Istanbul Time: ${istanbulNow.toISOString().replace('T', ' ').substring(0, 19)}`);
    console.log(`Istanbul Range: ${istanbulStartDate.toISOString().replace('T', ' ').substring(0, 19)} to ${istanbulEndDate.toISOString().replace('T', ' ').substring(0, 19)}`);

    let allChats: any[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    const perPage = 100;

    while (hasMorePages) {
      console.log(`Fetching page ${currentPage}...`);

      const livechatResponse = await fetchWithRetry(
        `https://livechat.systemtest.store/api/v1/chats?page=${currentPage}&per_page=${perPage}&start_date=${startDateIstanbul}&end_date=${endDateIstanbul}&sort_by=created_at&sort_order=desc`,
        { headers: { "X-API-Key": settings.livechat_api_key } },
        3,
        2000
      );

      if (!livechatResponse.ok) {
        throw new Error(`LiveChat API error: ${livechatResponse.statusText}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const livechatData = await livechatResponse.json();
      const pageChats = livechatData.data || [];

      if (pageChats.length === 0) {
        console.log(`Page ${currentPage}: No chats found, stopping pagination`);
        hasMorePages = false;
      } else {
        const firstChat = pageChats[0];
        const lastChat = pageChats[pageChats.length - 1];
        console.log(`Page ${currentPage}: ${pageChats.length} chats`);
        console.log(`  First: ${firstChat?.id} at ${firstChat?.created_at} (${firstChat?.agent_name})`);
        console.log(`  Last: ${lastChat?.id} at ${lastChat?.created_at} (${lastChat?.agent_name})`);

        allChats = [...allChats, ...pageChats];
        console.log(`Total so far: ${allChats.length} chats`);
        currentPage++;

        if (livechatData.pagination) {
          const { page, total_pages, total } = livechatData.pagination;
          console.log(`Pagination info: Page ${page}/${total_pages}, Total chats in range: ${total}`);
          hasMorePages = page < total_pages;
          if (!hasMorePages) {
            console.log(`✓ Fetched all ${total} chats from ${total_pages} pages`);
          }
        } else {
          if (pageChats.length < perPage) {
            console.log(`Page ${currentPage - 1}: Less than ${perPage} chats, assuming last page`);
            hasMorePages = false;
          }
        }
      }
    }

    const chats = allChats;

    let syncedCount = 0;
    let newChatsCount = 0;
    let analyzedCount = 0;
    let alertsSent = 0;
    let skippedCount = 0;

    console.log(`Processing ${chats.length} chats...`);

    // Process in batches to avoid timeout
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(chats.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chats.length);
      const batchChats = chats.slice(batchStart, batchEnd);

      console.log(`\n=== Processing batch ${batchIndex + 1}/${totalBatches} (${batchChats.length} chats) ===`);

    for (const chat of batchChats) {
      const fullChatData = chat.properties?.full_chat_data || {};
      const rawChatData = chat.properties?.raw_chat_data || {};
      const lastThreadSummary = fullChatData.last_thread_summary || {};

      // CRITICAL FIX: Use thread_id as primary key, not chat_id
      // LiveChat can have multiple threads (conversations) per chat container
      // Each thread must be stored as a separate record
      const parentChatId = chat.id; // Container ID (e.g., TA5IINASEO)
      const threadId = lastThreadSummary.id || chat.id; // Thread ID (e.g., TA5IINASFO)

      const agentName = chat.agent_name || "Unknown";
      const customerName = chat.customer_name || "Unknown";
      const createdAt = lastThreadSummary.created_at || chat.created_at;

      console.log(`\n=== Chat ${parentChatId} | Thread ${threadId} ===`);
      console.log("Agent:", agentName, "| Customer:", customerName);

      const { data: existingChat } = await supabase
        .from("chats")
        .select("id, analyzed")
        .eq("id", threadId)
        .maybeSingle();

      const allMessages = fullChatData.all_messages || [];
      const lastEventPerType = fullChatData.last_event_per_type || {};

      let messageCount = 0;
      const messages: any[] = [];
      let agentMessageCount = 0;
      let customerMessageCount = 0;

      // Helper function to detect welcome/auto messages
      const isAutoWelcomeMessage = (text: string, isFirstAgentMsg: boolean): boolean => {
        if (!isFirstAgentMsg) return false;
        const lowerText = text.toLowerCase();
        const welcomePhrases = ['hoş geldiniz', 'merhaba', 'nasıl yardımcı', 'size nasıl', 'yardımcı olabilirim'];
        return welcomePhrases.some(phrase => lowerText.includes(phrase)) && text.length < 150;
      };

      let firstAgentMsgSeen = false;

      // Use all_messages if available (new API format)
      if (allMessages.length > 0) {
        for (const event of allMessages) {
          if (event && event.text) {
            if (event.type === "message") {
              const authorType = event.author_id.includes("@") ? "agent" : "customer";
              const isWelcomeByFlag = event.properties?.lc2?.welcome_message === true;
              const isFirstAgentMessage = authorType === "agent" && !firstAgentMsgSeen;
              const isWelcomeByContent = isAutoWelcomeMessage(event.text, isFirstAgentMessage);
              const isWelcomeMessage = isWelcomeByFlag || isWelcomeByContent;

              if (authorType === "agent") firstAgentMsgSeen = true;

              messageCount++;

              // Don't count welcome messages as real agent messages for missed chat detection
              if (authorType === "agent" && !isWelcomeMessage) agentMessageCount++;
              if (authorType === "customer") customerMessageCount++;

              messages.push({
                chat_id: threadId,
                message_id: event.id,
                author_id: event.author_id,
                author_type: authorType,
                text: event.text,
                created_at: event.created_at,
                is_system: false,
              });
            } else if (event.type === "system_message") {
              messages.push({
                chat_id: threadId,
                message_id: event.id,
                author_id: "system",
                author_type: "system",
                text: event.text,
                created_at: event.created_at,
                is_system: true,
              });
            }
          }
        }
      } else {
        firstAgentMsgSeen = false;
        // Fallback to last_event_per_type for backwards compatibility
        for (const [_, eventData] of Object.entries(lastEventPerType)) {
          const event: any = (eventData as any)?.event;
          if (event && event.text) {
            if (event.type === "message") {
              const authorType = event.author_id.includes("@") ? "agent" : "customer";
              const isWelcomeByFlag = event.properties?.lc2?.welcome_message === true;
              const isFirstAgentMessage = authorType === "agent" && !firstAgentMsgSeen;
              const isWelcomeByContent = isAutoWelcomeMessage(event.text, isFirstAgentMessage);
              const isWelcomeMessage = isWelcomeByFlag || isWelcomeByContent;

              if (authorType === "agent") firstAgentMsgSeen = true;

              messageCount++;

              // Don't count welcome messages as real agent messages for missed chat detection
              if (authorType === "agent" && !isWelcomeMessage) agentMessageCount++;
              if (authorType === "customer") customerMessageCount++;

              messages.push({
                chat_id: threadId,
                message_id: event.id,
                author_id: event.author_id,
                author_type: authorType,
                text: event.text,
                created_at: event.created_at,
                is_system: false,
              });
            } else if (event.type === "system_message") {
              messages.push({
                chat_id: threadId,
                message_id: event.id,
                author_id: "system",
                author_type: "system",
                text: event.text,
                created_at: event.created_at,
                is_system: true,
              });
            }
          }
        }
      }

      const status = lastThreadSummary.active === false ? "archived" : "active";
      const endedAt = rawChatData.ended_at || null;
      const durationSeconds = rawChatData.chat_duration_seconds || null;

      // Calculate first response time from messages
      let firstResponseTime = rawChatData.first_response_time_seconds || null;

      if (!firstResponseTime && messages.length > 0) {
        // Find first customer message (non-system, non-welcome)
        const firstCustomerMsg = messages.find(m => m.author_type === 'customer' && !m.is_system);

        // Find first real agent response (non-system, after customer message)
        let firstAgentResponse = null;
        if (firstCustomerMsg) {
          const firstCustomerTime = new Date(firstCustomerMsg.created_at).getTime();

          for (const msg of messages) {
            if (msg.author_type === 'agent' && !msg.is_system) {
              const msgTime = new Date(msg.created_at).getTime();
              // Agent message must come after customer message
              if (msgTime > firstCustomerTime) {
                // Check if this is not a welcome message
                const isWelcome = isAutoWelcomeMessage(msg.text, true);
                if (!isWelcome) {
                  firstAgentResponse = msg;
                  break;
                }
              }
            }
          }

          // Calculate difference in seconds
          if (firstAgentResponse) {
            const responseTime = new Date(firstAgentResponse.created_at).getTime();
            firstResponseTime = Math.round((responseTime - firstCustomerTime) / 1000);
            console.log(`Calculated first response time: ${firstResponseTime}s (Customer: ${firstCustomerMsg.created_at}, Agent: ${firstAgentResponse.created_at})`);
          }
        }
      }

      // REAL missed chat detection: customer sent messages but agent never replied
      const isMissed = customerMessageCount > 0 && agentMessageCount === 0 && status === "archived";
      console.log(`Thread ${threadId} (Chat ${parentChatId}): Customer msgs: ${customerMessageCount}, Agent msgs: ${agentMessageCount}, Status: ${status}, isMissed: ${isMissed}`);

      // Extract rating information from LiveChat API response
      const ratingScore = rawChatData.rating_score || null;
      const ratingStatus = rawChatData.rating_status || (ratingScore ? 'rated' : 'not_rated');
      const ratingComment = rawChatData.rating_comment || null;
      const hasRatingComment = rawChatData.has_rating_comment || false;
      const complaintFlag = rawChatData.complaint_flag || false;

      const chatRecord = {
        id: threadId,
        chat_id: parentChatId,
        agent_name: agentName,
        customer_name: customerName,
        created_at: createdAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        message_count: messageCount,
        chat_data: chat,
        status: status,
        analyzed: existingChat?.analyzed || false,
        synced_at: new Date().toISOString(),
        first_response_time: firstResponseTime,
        rating_score: ratingScore,
        rating_status: ratingStatus,
        rating_comment: ratingComment,
        has_rating_comment: hasRatingComment,
        complaint_flag: complaintFlag,
      };

      await supabase.from("chats").upsert(chatRecord);

      if (messages.length > 0) {
        await supabase.from("chat_messages").upsert(messages, {
          onConflict: "message_id",
          ignoreDuplicates: true,
        });
      }

      await supabase.from("personnel").upsert(
        { name: agentName, updated_at: new Date().toISOString() },
        { onConflict: "name", ignoreDuplicates: true }
      );

      syncedCount++;
      if (!existingChat) newChatsCount++;

      if (isMissed) {
        console.log("  ⚠️ MISSED CHAT detected - checking for existing alert...");
        const { data: existingMissedAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("chat_id", threadId)
          .eq("alert_type", "missed_chat")
          .maybeSingle();

        if (!existingMissedAlert) {
          const chatDate = new Date(createdAt).toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          const missedAlertMessage = `⚠️ KAÇIRILMIŞ CHAT\n\n` +
            `Chat ID: ${parentChatId}\n` +
            `Thread ID: ${threadId}\n` +
            `Tarih: ${chatDate}\n` +
            `Temsilci: ${agentName}\n` +
            `Müşteri: ${customerName}\n\n` +
            `Bu chat müşteri tarafından başlatıldı ancak hiç yanıt alınamadı.`;

          await supabase.from("alerts").insert({
            chat_id: threadId,
            analysis_id: null,
            alert_type: "missed_chat",
            severity: "high",
            message: missedAlertMessage,
            sent_to_telegram: false,
          });

          if (settings.telegram_bot_token && settings.telegram_chat_id) {
            try {
              const tgResponse = await fetch(
                `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: settings.telegram_chat_id,
                    text: missedAlertMessage,
                  }),
                }
              );

              if (tgResponse.ok) {
                const tgData = await tgResponse.json();
                await supabase
                  .from("alerts")
                  .update({
                    sent_to_telegram: true,
                    telegram_message_id: tgData.result?.message_id?.toString(),
                  })
                  .eq("chat_id", chatId)
                  .eq("alert_type", "missed_chat")
                  .eq("sent_to_telegram", false);
                alertsSent++;
              }
            } catch (tgErr) {
              console.error("Telegram error for missed chat:", tgErr);
            }
          }
        }
      }
    }

      console.log(`Batch ${batchIndex + 1} completed: ${batchChats.length} chats processed`);
    }

    const { count: totalChats } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true });
    const { count: totalAnalyzed } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("analyzed", true);

    // Get today's chats count using Istanbul timezone
    const { data: todayChatsData, error: todayChatsError } = await supabase
      .rpc('get_today_chats_istanbul');

    const todayChatsCount = todayChatsData?.length || 0;

    if (todayChatsError) {
      console.error('Error fetching today chats:', todayChatsError);
    }

    const result = {
      success: true,
      synced: syncedCount,
      new_chats: newChatsCount,
      analyzed: analyzedCount,
      alerts_sent: alertsSent,
      skipped: skippedCount,
      total_chats: totalChats,
      total_analyzed: totalAnalyzed,
      today_chats_istanbul: todayChatsCount,
      timestamp: new Date().toISOString(),
      timestamp_istanbul: istanbulNow.toISOString().replace('T', ' ').substring(0, 19),
    };

    // Update job status if processing as background job
    if (jobId) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result: result,
        })
        .eq("id", jobId);
      console.log(`Job ${jobId} marked as completed`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipeline error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error || "Unknown error");
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Update job status to failed if this is a background job
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    if (jobId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from("sync_jobs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error: errorMessage,
            })
            .eq("id", jobId);
          console.log(`Job ${jobId} marked as failed`);
        } catch (updateErr) {
          console.error("Failed to update job status:", updateErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stack: errorStack,
        type: typeof error
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
