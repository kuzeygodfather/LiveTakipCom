import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BonusRule {
  id: string;
  rule_name: string;
  metric_type: string;
  condition_type: 'greater_than' | 'less_than' | 'between' | 'equals';
  threshold_min: number;
  threshold_max: number | null;
  bonus_amount: number;
  period_type: string;
  is_active: boolean;
}

interface PersonnelMetrics {
  personnel_id: string;
  personnel_name: string;
  total_chats: number;
  avg_score: number;
  avg_satisfaction: number;
  avg_response_time: number;
  positive_chats_count: number;
  negative_chats_count: number;
  neutral_chats_count: number;
}

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

    const { period_type, period_start, period_end } = await req.json();

    if (!period_type || !['daily', 'weekly', 'monthly'].includes(period_type)) {
      throw new Error("Invalid period_type. Must be 'daily', 'weekly', or 'monthly'");
    }

    let start: Date;
    let end: Date;

    if (period_start && period_end) {
      start = new Date(period_start);
      end = new Date(period_end);
    } else {
      end = new Date();
      start = new Date();

      if (period_type === 'daily') {
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
      } else if (period_type === 'weekly') {
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period_type === 'monthly') {
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }
    }

    const { data: activeRules, error: rulesError } = await supabase
      .from('bonus_rules')
      .select('*')
      .eq('is_active', true)
      .eq('period_type', period_type);

    if (rulesError) throw rulesError;

    if (!activeRules || activeRules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active bonus rules found for this period type",
          calculations: [],
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let allPersonnel: any[] = [];
    let from = 0;
    const personnelBatchSize = 1000;

    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('personnel')
        .select('id, name')
        .range(from, from + personnelBatchSize - 1);

      if (batchError) throw batchError;
      if (!batch || batch.length === 0) break;
      allPersonnel = [...allPersonnel, ...batch];
      if (batch.length < personnelBatchSize) break;
      from += personnelBatchSize;
    }

    const calculations = [];

    for (const person of allPersonnel) {
      const metrics = await calculatePersonnelMetrics(
        supabase,
        person.id,
        start,
        end
      );

      const bonusDetails: any[] = [];
      let totalBonus = 0;

      for (const rule of activeRules as BonusRule[]) {
        const metricValue = getMetricValue(metrics, rule.metric_type);
        const qualifies = checkRuleCondition(
          metricValue,
          rule.condition_type,
          rule.threshold_min,
          rule.threshold_max,
          rule.metric_type,
          metrics.total_chats
        );

        if (qualifies) {
          bonusDetails.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            metric_type: rule.metric_type,
            metric_value: metricValue,
            bonus_amount: rule.bonus_amount,
          });
          totalBonus += rule.bonus_amount;
        }
      }

      const { data: calculation, error: calcError } = await supabase
        .from('bonus_calculations')
        .upsert({
          personnel_id: person.id,
          period_type,
          period_start: start.toISOString(),
          period_end: end.toISOString(),
          total_bonus_amount: totalBonus,
          calculation_details: bonusDetails,
          metrics_snapshot: metrics,
          calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'personnel_id,period_type,period_start,period_end',
        })
        .select()
        .single();

      if (!calcError && calculation) {
        calculations.push({
          personnel_name: person.name,
          total_bonus: totalBonus,
          rules_applied: bonusDetails.length,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        period_type,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        calculations,
        total_bonuses: calculations.reduce((sum, c) => sum + c.total_bonus, 0),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Bonus calculation error:", error);
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

async function calculatePersonnelMetrics(
  supabase: any,
  personnelId: string,
  start: Date,
  end: Date
): Promise<PersonnelMetrics> {
  const { data: personnel } = await supabase
    .from('personnel')
    .select('name')
    .eq('id', personnelId)
    .maybeSingle();

  if (!personnel) {
    return {
      personnel_id: personnelId,
      personnel_name: 'Unknown',
      total_chats: 0,
      avg_score: 0,
      avg_satisfaction: 0,
      avg_response_time: 0,
      positive_chats_count: 0,
      negative_chats_count: 0,
      neutral_chats_count: 0,
    };
  }

  let allChats: any[] = [];
  let from = 0;
  const chatBatchSize = 1000;

  while (true) {
    const { data: batch } = await supabase
      .from('chats')
      .select(`
        id,
        agent_name,
        created_at,
        first_response_time,
        chat_analysis!inner(
          overall_score,
          sentiment,
          performance_metrics,
          quality_metrics
        )
      `)
      .eq('agent_name', personnel.name)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .range(from, from + chatBatchSize - 1);

    if (!batch || batch.length === 0) break;
    allChats = [...allChats, ...batch];
    if (batch.length < chatBatchSize) break;
    from += chatBatchSize;
  }

  const totalChats = allChats.length;
  let totalScore = 0;
  let totalResponseTime = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let validScores = 0;
  let validResponseTime = 0;

  for (const chat of allChats) {
    const analysis = Array.isArray(chat.chat_analysis)
      ? chat.chat_analysis[0]
      : chat.chat_analysis;
    if (!analysis) continue;

    if (analysis.overall_score != null) {
      totalScore += Number(analysis.overall_score);
      validScores++;
    }

    if (chat.first_response_time != null) {
      totalResponseTime += Number(chat.first_response_time);
      validResponseTime++;
    }

    const sentiment = analysis.sentiment;
    if (sentiment === 'positive') positiveCount++;
    else if (sentiment === 'negative') negativeCount++;
    else if (sentiment === 'neutral') neutralCount++;
  }

  const avgSatisfaction = totalChats > 0
    ? (positiveCount / totalChats) * 100
    : 0;

  return {
    personnel_id: personnelId,
    personnel_name: personnel.name,
    total_chats: totalChats,
    avg_score: validScores > 0 ? totalScore / validScores : 0,
    avg_satisfaction: avgSatisfaction,
    avg_response_time: validResponseTime > 0 ? totalResponseTime / validResponseTime : 0,
    positive_chats_count: positiveCount,
    negative_chats_count: negativeCount,
    neutral_chats_count: neutralCount,
  };
}

function getMetricValue(metrics: PersonnelMetrics, metricType: string): number {
  switch (metricType) {
    case 'total_chats':
      return metrics.total_chats;
    case 'avg_score':
      return metrics.avg_score;
    case 'avg_satisfaction':
      return metrics.avg_satisfaction;
    case 'avg_response_time':
      return metrics.avg_response_time;
    case 'positive_chats_count':
      return metrics.positive_chats_count;
    case 'negative_chats_count':
      return metrics.negative_chats_count;
    case 'neutral_chats_count':
      return metrics.neutral_chats_count;
    default:
      return 0;
  }
}

function checkRuleCondition(
  value: number,
  condition: string,
  thresholdMin: number,
  thresholdMax: number | null,
  metricType: string,
  totalChats: number
): boolean {
  if (totalChats === 0) {
    return false;
  }

  const averageMetrics = ['avg_response_time', 'avg_score', 'avg_satisfaction'];
  if (averageMetrics.includes(metricType) && value === 0) {
    return false;
  }

  switch (condition) {
    case 'greater_than':
      return value >= thresholdMin;
    case 'less_than':
      return value <= thresholdMin;
    case 'equals':
      return value === thresholdMin;
    case 'between':
      return thresholdMax !== null && value >= thresholdMin && value <= thresholdMax;
    default:
      return false;
  }
}
