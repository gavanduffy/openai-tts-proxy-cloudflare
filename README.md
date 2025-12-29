# OpenAI TTS Proxy for Cloudflare Workers AI

This project provides a Cloudflare Worker that acts as a proxy, translating OpenAI TTS API-style requests to Cloudflare Workers AI TTS models (Aura-1, Aura-2, MeloTTS).

## Features
- Accepts OpenAI TTS API-style POST requests
- Supports Cloudflare TTS models: Aura-1, Aura-2, and MeloTTS
- Maps OpenAI fields to the correct Cloudflare model parameters
- Returns audio in binary or base64 JSON format

## Usage
1. Deploy the worker using Wrangler and your Cloudflare account credentials.
2. Send a POST request to the worker endpoint with a JSON body:

```
{
  "model": "aura-1" | "aura-2" | "melo",
  "input": "Text to synthesize",
  "voice": "Speaker name (see docs)",
  "response_format": "json" | undefined
}
```

- For Aura models, `voice` maps to the `speaker` parameter.
- For MeloTTS, `input` maps to `prompt` and `lang` is set to "en" by default.

## Deployment
- Edit `wrangler.toml` with your Cloudflare account ID and API token.
- Deploy with:
  ```
  wrangler deploy --config openai-tts-proxy/wrangler.toml
  ```

## References
- [Cloudflare Workers AI TTS Models](https://developers.cloudflare.com/workers-ai/models/)
- [Aura-1](https://developers.cloudflare.com/workers-ai/models/aura-1/)
- [Aura-2](https://developers.cloudflare.com/workers-ai/models/aura-2-en/)
- [MeloTTS](https://developers.cloudflare.com/workers-ai/models/melotts/)
