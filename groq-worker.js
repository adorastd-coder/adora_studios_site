const ANSWERS = [
  "Our core service is Meta (Facebook & Instagram) ads management starting at $300-400 per month. We also offer Google Search Ads as an add-on from month two for an extra $100-150/month.",
  "Yes, the free audit is a 20-minute video call where we analyse your current ad setup, find leaks, and give you actionable fixes - no obligation to work with us.",
  "We only do paid ads (Meta & Google). We don't do SEO, content creation, or social media management. This focus lets us deliver better results.",
  "Most campaigns go live within one week of signing the retainer. The free audit can be booked within a few days.",
  "You keep full control of your ad spend - it stays in your own Meta or Google Ads account. We only ask for manager access, never billing access.",
  "Yes, we specialise in AU and EU markets. We understand local consumer behaviour, compliance, and cost structures.",
  "We optimise for qualified leads, not likes or vanity metrics. Monthly reports focus on lead volume and cost per lead.",
  "There are no long-term contracts. If we don't generate results within 60 days, you can leave without penalty.",
  "At the moment we are early and being selective. That's why we offer a reduced first-month rate - so we can prove ourselves with your account.",
  "To get started, simply book a free audit using the button on the page. After the call, we'll send you a simple agreement and invoice.",
  "You can reach the owner directly using the message bubble on the bottom-right corner. We usually reply within one business day.",
  "We run ads on Facebook, Instagram, and Google Search. We do not run TikTok, LinkedIn, or Twitter ads.",
  "Our process is: free audit (week 0), build & launch (week 1), then daily optimisation and monthly reporting.",
  "If your ads are not converting, the most common issues are poor targeting, weak hooks, or no follow-up system. We fix all three.",
  "No, we don't offer one-time campaign setup. We work on a monthly retainer because continuous optimisation drives the best results.",
  "Absolutely, you can upgrade from Meta ads to include Google Search Ads at any time after the first month.",
  "The cost per lead depends on your industry, location, and offer. In the free audit we give you a realistic estimate based on your specific situation.",
  "You will receive a monthly report with plain-English metrics: spend, leads, cost per lead, and recommendations.",
  "No, we don't require a minimum ad budget. We help you decide what makes sense during the audit.",
  "Yes, we work with service-based businesses, e-commerce, local shops, and B2B companies - as long as paid ads are a viable channel."
];

const FALLBACK = "I'm not sure - please contact the owner directly using the message bubble next to me.";
const MAX_MESSAGE_LENGTH = 800;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export default {
  async fetch(request, env, ctx) {
    if (!env.ALLOWED_ORIGIN) {
      return new Response(
        JSON.stringify({
          error: "Worker is not configured (ALLOWED_ORIGIN missing)"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const allowedOrigin = env.ALLOWED_ORIGIN;
    const corsHeaders = getCorsHeaders(request, allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 415, corsHeaders);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: "Worker is not configured" }, 500, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return json({ error: "Missing message" }, 400, corsHeaders);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "Message is too long" }, 413, corsHeaders);
    }

    const cacheKey = await getCacheKey(request, message, env);
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      return withCors(cached, corsHeaders);
    }

    try {
      const reply = await getGroqReply(message, env);
      const response = json({ reply }, 200, {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300"
      });
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      console.error("Groq worker error", error);
      return json({ reply: FALLBACK }, 200, corsHeaders);
    }
  }
};

async function getGroqReply(message, env) {
  const systemPrompt = [
    "You are an AI assistant for Adora Studio, a paid ads agency.",
    "You must select exactly one answer from the pre-written answer list.",
    "Reply with that selected answer verbatim.",
    "If none match, reply with the fallback verbatim.",
    "Do not add extra text, markdown, numbering, or explanations.",
    "",
    `Fallback: ${FALLBACK}`,
    "",
    "Pre-written answers:",
    ...ANSWERS.map((answer, index) => `${index + 1}. ${answer}`)
  ].join("\n");

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || DEFAULT_MODEL,
      temperature: 0,
      max_completion_tokens: 180,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    })
  });

  const groqData = await groqResponse.json().catch(() => ({}));
  if (!groqResponse.ok) {
    throw new Error(groqData.error?.message || "Groq API request failed");
  }

  const reply = String(groqData.choices?.[0]?.message?.content || "").trim();
  return coerceToAllowedAnswer(reply);
}

function coerceToAllowedAnswer(reply) {
  if (ANSWERS.includes(reply) || reply === FALLBACK) return reply;
  const lowerReply = reply.toLowerCase();
  const contained = ANSWERS.find((answer) => lowerReply.includes(answer.toLowerCase()));
  return contained || FALLBACK;
}

function getCorsHeaders(request, allowedOrigin) {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigin.trim();
  const allowOrigin = allowed === origin ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

async function getCacheKey(request, message, env) {
  const hash = await sha256(message.toLowerCase());
  const url = new URL(request.url);
  url.pathname = `/cache/${env.GROQ_MODEL || DEFAULT_MODEL}/${hash}`;
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function withCors(response, corsHeaders) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    }
  });
}
