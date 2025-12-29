// Cloudflare Worker: OpenAI TTS Proxy to Workers AI
// Receives OpenAI API-style TTS requests and translates to Cloudflare Workers AI TTS

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // OpenAI TTS API expects: { model, input, voice, response_format, speed }
    const { input, voice, speed, response_format, model } = body;
    if (!input || !voice) {
      return new Response("Missing required fields: input, voice", { status: 400 });
    }

    // Map user input to model and payload variables
    // Accepts: 'aura-1', 'aura-2', 'melo' (case-insensitive)
    let selectedModel = "@cf/deepgram/aura-2-en";
    let workersAiPayload = {};
    let aiUrl = "";
    const modelKey = (model || "aura-2").toLowerCase();
    if (modelKey === "aura-1") {
      selectedModel = "@cf/deepgram/aura-1";
      // See https://developers.cloudflare.com/workers-ai/models/aura-1/
      workersAiPayload = {
        text: input,
        speaker: voice || "angus"
        // Optionally: encoding, container, sample_rate, bit_rate
      };
    } else if (modelKey === "aura-2" || modelKey === "aura-2-en") {
      selectedModel = "@cf/deepgram/aura-2-en";
      // See https://developers.cloudflare.com/workers-ai/models/aura-2-en/
      workersAiPayload = {
        text: input,
        speaker: voice || "luna"
        // Optionally: encoding, container, sample_rate, bit_rate
      };
    } else if (modelKey === "melo" || modelKey === "melotts") {
      selectedModel = "@cf/myshell-ai/melotts";
      // See https://developers.cloudflare.com/workers-ai/models/melotts/
      workersAiPayload = {
        prompt: input,
        lang: "en" // Optionally allow user to set language
      };
    } else {
      // fallback to aura-2-en
      selectedModel = "@cf/deepgram/aura-2-en";
      workersAiPayload = {
        text: input,
        speaker: voice || "luna"
      };
    }

    aiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${selectedModel}`;
    const aiHeaders = {
      "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json"
    };
    let aiResp;
    try {
      aiResp = await fetch(aiUrl, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify(workersAiPayload)
      });
    } catch (e) {
      return new Response("Error contacting Workers AI", { status: 502 });
    }

    if (!aiResp.ok) {
      return new Response("Workers AI error: " + (await aiResp.text()), { status: 502 });
    }

    // Workers AI returns { result: { audio: base64, mime_type: string } } for aura models
    // For melotts, result.audio is base64 MP3
    const aiJson = await aiResp.json();
    let audio, mime_type;
    if (selectedModel === "@cf/myshell-ai/melotts") {
      audio = aiJson.result?.audio;
      mime_type = "audio/mpeg";
    } else {
      audio = aiJson.result?.audio;
      mime_type = aiJson.result?.mime_type || "audio/mpeg";
    }
    if (!audio || !mime_type) {
      return new Response("Invalid response from Workers AI", { status: 502 });
    }

    // OpenAI TTS can return audio in binary or base64 JSON
    if (response_format === "json") {
      return new Response(JSON.stringify({ audio, mime_type }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // Default: binary audio
      const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      return new Response(audioBuffer, {
        headers: { "Content-Type": mime_type }
      });
    }
  }
};