# Tabyan Smart Mushaf — Official Nabr / Qurani.ai QRC Protocol
**Document Version:** 1.0.0  
**Authority:** Current official Qurani.ai documentation  

---

## 1. Connection & Authentication
- **Endpoint:** `wss://api.qurani.ai`
- **Query Parameter:** API key provided in WebSocket query string.
- **Client Security Rule:** No live API key in browser source bundle. Replit backend will handle authenticated forwarding or proxying.

## 2. Serialization Format
- Messages are binary MessagePack (`msgpack`).

## 3. Core Protocol Methods
1. `START_TILAWA_SESSION`
   - `chapter_index`: 0-based
   - `verse_index`: 0-based
   - `word_index`: 0-based
   - `hafz_level`: 1..5
   - `tajweed_level`: 1..5

2. `CHECK_TILAWA_AUDIO`
   - Binary audio chunk (16 kHz mono WAV with RIFF header or raw 20ms Opus frame).

3. `RESET_TILAWA_SESSION`
   - Flushes provider state and stops tracking.

## 4. Expected Events
- `QRC_CLIENT_CONNECTED`
- `TILAWA_SESSION_STARTED`
- `TILAWA_SESSION_ENDED`
- `TILAWA_RESULT` (`chapter_index`, `verse_index`, `word_index`, `correct_words`, `skipped_words`, `tajweed_mistakes`, `letter_mistakes`)
- `KEEP_ALIVE`
- `QRC_ERROR`
