# Source capture: market-qf-js-sdk

URL: https://api-docs.quran.foundation/docs/sdk/javascript/
Fetched: 2026-10-15

[Skip to main content](https://api-docs.quran.foundation/docs/sdk/javascript/#docusaurus_skipToContent_fallback)

On this page

Purpose: Choose the correct SDK entrypoint before you write code.
Use this when: You want to use Quran Foundation APIs from JavaScript or TypeScript.
Do not use this when: You only need raw HTTP examples and do not want an SDK.
Backend required: Depends on the API family and your client type.
Allowed runtimes: Node.js, serverless functions, workers, browser apps, mobile apps.
Required credentials: `client_id` always. `client_secret` only on the server.
Minimal import: `@quranjs/api/server` or `@quranjs/api/public`.

The SDK now has **two runtime entrypoints**:

- `@quranjs/api/server`
- `@quranjs/api/public`

Use these entrypoints for new code. They make the safe runtime boundary obvious by separating server-only API access from browser and mobile flows.

For backwards compatibility, `@quranjs/api` still exports the legacy `QuranClient`, so existing integrations do not need to migrate immediately. Moving to `@quranjs/api/server` or `@quranjs/api/public` is recommended cleanup, not a breaking upgrade requirement.

If you are still asking "what kind of app am I building?" start with [App Shapes](https://api-docs.quran.foundation/docs/sdk/javascript/app-shapes/). It is the shortest path to the right architecture.

The SDK has production defaults, while the onboarding examples below explicitly use pre-live so they work with a newly created Developer Console app. Switch credentials and every configured service URL to production together only after production permissions are granted. If you are maintaining the SDK itself and need local smoke or local docs instructions, use the maintainer guide in the [`api-js` repo](https://github.com/quran/api-js/tree/main/packages/api#local-development).

## SDK vs Starter App [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#sdk-vs-starter-app "Direct link to heading")

The SDK is the library: import `@quranjs/api/server` in backend code and
`@quranjs/api/public` in browser or mobile-facing code.

The starter is a generated Next.js app built with the SDK. It gives you a
working reader, search, OAuth2 session, notes, bookmarks, collections, goals,
preferences, and QuranReflect-related surfaces. Use the starter when you want a
working app to customize. Use the SDK directly when you already have your own UI
and backend.

User APIs can be called with the SDK, but your app still needs OAuth2 login,
session storage, token refresh, and approved scopes. The starter includes those
pieces; SDK-only integrations must wire them according to the app type selected
in Developer Console.

If you use the full-stack OAuth2 example, remember that it is an interactive React SPA shell backed by server-side sessions. For serious multi-instance production deployments, use a shared session store such as Redis.

## Quick Start With Scaffold [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#quick-start-with-scaffold "Direct link to heading")

Use the official NPX scaffold when you want a complete app before customizing
the UI or reading lower-level OAuth2 details:

```bash
npx @quranjs/create-app@latest my-quran-app --template next --package-manager npm --install --git --sdk-source npm --yes
```

Then follow:

- [Starter With NPX](https://api-docs.quran.foundation/docs/tutorials/oidc/starter-with-npx/)

## Two Token Paths [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#two-token-paths "Direct link to heading")

There are two different tokens in the system:

- The **user token** is for personal actions like notes, bookmarks, collections, and QuranReflect user data.
- The **app token** is for app-level reads like Quran content and search.

They solve different jobs, so they can expire at different times. That is why Content can still work even when User APIs start failing. Content and Search use a separate app token that `@quranjs/api/server` gets with `client_credentials`. User APIs use the signed-in user's session token.

For a **Backend/server app**, the browser never gets the `client_secret`; the backend exchanges codes, refreshes user sessions, and requests app tokens. A **Frontend or mobile app** is public, receives no secret, and exchanges its authorization code with PKCE.

## PKCE and Client Type [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#pkce-and-client-type "Direct link to heading")

PKCE is the "proof" the app sends during login. It helps the app prove the same login request came back to it.

For a **Backend/server app**, PKCE is only half the story:

- The frontend or mobile app starts login with PKCE.
- The backend or BFF finishes the confidential parts, like code exchange and refresh.
- The backend stores the session server-side.

For a **Frontend or mobile app**, Developer Console creates a public client. The app exchanges the code with PKCE, refreshes with `client_id` and no secret, and does not need a backend for the OAuth exchange. Browser-origin restrictions may still require an API proxy.

## Pick Your Setup [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#pick-your-setup "Direct link to heading")

If you want the very short version, use this:

- **SPA only**: Select **Frontend or mobile app** in Developer Console; use User APIs with a public client and PKCE.
- **Mobile only**: Select **Frontend or mobile app** and use the same public-client flow.
- **Frontend + backend**: Select **Backend/server app** for Content, Search, or apps that mix user features with Quran data.

### I have a backend [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#i-have-a-backend "Direct link to heading")

Use `@quranjs/api/server`.

This is the right choice for:

- Content APIs
- Search APIs
- Confidential OAuth2 token exchange
- Cron jobs
- Workers
- Server-side rendering

### I have frontend + backend [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#i-have-frontend--backend "Direct link to heading")

Use both:

- frontend: `@quranjs/api/public`
- backend: `@quranjs/api/server`

This is the recommended setup for most apps.

### I only have frontend or mobile [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#i-only-have-frontend-or-mobile "Direct link to heading")

Use `@quranjs/api/public`.

This only works safely for:

- PKCE login
- user-session flows
- clients created with the **Frontend or mobile app** type in Developer Console

It does **not** support `client_secret`.

## Do I Need a Backend? [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#do-i-need-a-backend "Direct link to heading")

| API family | Backend required? | Notes |
| --- | --- | --- |
| Content | Yes | Use `@quranjs/api/server` |
| Search | Yes | Use `@quranjs/api/server` |
| User APIs | Depends | Public frontend/mobile apps can authenticate without a backend; origin restrictions may still require a proxy |
| OAuth2 login for backend/server apps | Yes | Frontend starts PKCE, backend exchanges the code with client authentication |
| OAuth2 login for frontend/mobile apps | No | Public client exchanges the code with PKCE and no secret |

If your app is deployed as an edge frontend, keep the confidential exchange, refresh, and shared session store in a backend or BFF layer. The edge can still be the entrypoint for users.

## Use the Right Import [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#use-the-right-import "Direct link to heading")

### Server [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#server "Direct link to heading")

```ts
import { createServerClient } from "@quranjs/api/server";

const client = createServerClient({
  clientId: process.env.QF_CLIENT_ID!,
  clientSecret: process.env.QF_CLIENT_SECRET!,
  services: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
});

const chapters = await client.content.v4.chapters.list();
```

### Public [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#public "Direct link to heading")

```ts
import { createPublicClient } from "@quranjs/api/public";

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
const codeVerifier = base64url(verifierBytes);
const codeChallenge = base64url(
  new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier),
    ),
  ),
);
const state = crypto.randomUUID();
const nonce = crypto.randomUUID();

sessionStorage.setItem(
  "qf:oauth:pending",
  JSON.stringify({ codeVerifier, nonce, state }),
);

const client = createPublicClient({
  clientId: "your-client-id",
  clientType: "public",
  services: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
});

const authUrl = client.oauth2.v1.authorizeUrl({
  client_id: "your-client-id",
  redirect_uri: "http://localhost:3000/callback",
  response_type: "code",
  scope: "openid offline_access user bookmark",
  state,
  nonce,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
});
```

The callback must validate `state`, retrieve and remove the stored verifier, and pass it as `codeVerifier` to `client.oauth2.v1.exchangeCode`. See the [Public Quickstart](https://api-docs.quran.foundation/docs/sdk/javascript/public-quickstart/) for the complete callback example.

## First Working Examples [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#first-working-examples "Direct link to heading")

### Server example [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#server-example "Direct link to heading")

```ts
import { createServerClient } from "@quranjs/api/server";

const client = createServerClient({
  clientId: process.env.QF_CLIENT_ID!,
  clientSecret: process.env.QF_CLIENT_SECRET!,
  services: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
});

const chapters = await client.content.v4.chapters.list();
```

Search requires additional permission in Developer Console; add Search calls only after that permission is granted for the same environment.

### Full-stack example [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#full-stack-example "Direct link to heading")

Frontend:

```ts
import { createPublicClient } from "@quranjs/api/public";

const client = createPublicClient({
  clientId: "your-client-id",
  clientType: "confidential-proxy",
  services: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
});
```

Backend:

```ts
import { createServerClient } from "@quranjs/api/server";

const client = createServerClient({
  clientId: process.env.QF_CLIENT_ID!,
  clientSecret: process.env.QF_CLIENT_SECRET!,
  services: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
});
```

## Common Mistakes [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#common-mistakes "Direct link to heading")

- Putting `client_secret` in browser or mobile code.
- Calling Content or Search from `@quranjs/api/public`.
- Assuming every client can exchange OAuth2 codes directly.
- Sending new pre-live credentials to the SDK's production defaults instead of configuring both pre-live service URLs.
- Treating `word.audioUrl` as a Content API path. Resolve word-by-word audio against `https://audio.qurancdn.com/` instead.
- Starting new code with the legacy root `QuranClient` instead of choosing the runtime-specific client for your app shape.

## AI Handoff Prompt [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#ai-handoff-prompt "Direct link to heading")

Canonical prompt ID: QF\_NPX\_STARTER\_PROMPT\_V1

The copyable prompt above is published as `QF_NPX_STARTER_PROMPT_V1`:

- [Raw prompt](https://api-docs.quran.foundation/agent-prompts/qf-next-starter.md/)
- [Prompt registry](https://api-docs.quran.foundation/.well-known/agent-prompts/index.json/)

## Read Next [​](https://api-docs.quran.foundation/docs/sdk/javascript/\#read-next "Direct link to heading")

- [App Shapes](https://api-docs.quran.foundation/docs/sdk/javascript/app-shapes/)
- [Runtime Matrix](https://api-docs.quran.foundation/docs/sdk/javascript/runtime-matrix/)
- [Auth Matrix](https://api-docs.quran.foundation/docs/sdk/javascript/auth-matrix/)
- [SDK Entrypoint Matrix](https://api-docs.quran.foundation/docs/sdk/javascript/entrypoint-matrix/)
- [APIs By Runtime](https://api-docs.quran.foundation/docs/sdk/javascript/apis-by-runtime/)
- [Server Quickstart](https://api-docs.quran.foundation/docs/sdk/javascript/server-quickstart/)
- [Public Quickstart](https://api-docs.quran.foundation/docs/sdk/javascript/public-quickstart/)
- [Full-Stack Quickstart](https://api-docs.quran.foundation/docs/sdk/javascript/full-stack/)
- [App State](https://api-docs.quran.foundation/docs/sdk/javascript/app-state/)
- [QuranReflect Posts](https://api-docs.quran.foundation/docs/sdk/javascript/quranreflect-posts/)
- [Common Errors](https://api-docs.quran.foundation/docs/sdk/javascript/common-errors/)
- [Migration Cheat Sheet](https://api-docs.quran.foundation/docs/sdk/javascript/migration-cheat-sheet/)
- [Answers API](https://api-docs.quran.foundation/docs/sdk/javascript/answers/)

- [SDK vs Starter App](https://api-docs.quran.foundation/docs/sdk/javascript/#sdk-vs-starter-app)
- [Quick Start With Scaffold](https://api-docs.quran.foundation/docs/sdk/javascript/#quick-start-with-scaffold)
- [Two Token Paths](https://api-docs.quran.foundation/docs/sdk/javascript/#two-token-paths)
- [PKCE and Client Type](https://api-docs.quran.foundation/docs/sdk/javascript/#pkce-and-client-type)
- [Pick Your Setup](https://api-docs.quran.foundation/docs/sdk/javascript/#pick-your-setup)
  - [I have a backend](https://api-docs.quran.foundation/docs/sdk/javascript/#i-have-a-backend)
  - [I have frontend + backend](https://api-docs.quran.foundation/docs/sdk/javascript/#i-have-frontend--backend)
  - [I only have frontend or mobile](https://api-docs.quran.foundation/docs/sdk/javascript/#i-only-have-frontend-or-mobile)
- [Do I Need a Backend?](https://api-docs.quran.foundation/docs/sdk/javascript/#do-i-need-a-backend)
- [Use the Right Import](https://api-docs.quran.foundation/docs/sdk/javascript/#use-the-right-import)
  - [Server](https://api-docs.quran.foundation/docs/sdk/javascript/#server)
  - [Public](https://api-docs.quran.foundation/docs/sdk/javascript/#public)
- [First Working Examples](https://api-docs.quran.foundation/docs/sdk/javascript/#first-working-examples)
  - [Server example](https://api-docs.quran.foundation/docs/sdk/javascript/#server-example)
  - [Full-stack example](https://api-docs.quran.foundation/docs/sdk/javascript/#full-stack-example)
- [Common Mistakes](https://api-docs.quran.foundation/docs/sdk/javascript/#common-mistakes)
- [AI Handoff Prompt](https://api-docs.quran.foundation/docs/sdk/javascript/#ai-handoff-prompt)
- [Read Next](https://api-docs.quran.foundation/docs/sdk/javascript/#read-next)