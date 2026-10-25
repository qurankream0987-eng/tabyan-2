# Source capture: market-qf-content-sync

URL: https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/
Fetched: 2026-10-15

[Skip to main content](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#docusaurus_skipToContent_fallback)

On this page

# Getting Started with Content Sync

Content Sync helps an app keep a local copy of public Quran Foundation content fresh.
Instead of downloading every Mushaf, translation, word-by-word translation,
word-by-word transliteration, tafsir, recitation, chapter recitation, or article
again, your app asks:

1. What changed since the last time I checked?
2. Which small rows can I update directly?
3. Which full content copy do I need to download again?

## Environments and Resource Availability [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#environments-and-resource-availability "Direct link to heading")

Content Sync is available in prelive and production. Use the matching credentials and Content API base URL:

| Environment | Content API base URL |
| --- | --- |
| Prelive | `https://apis-prelive.quran.foundation/content/api/v4` |
| Production | `https://apis.quran.foundation/content/api/v4` |

The examples below use production. Resource publication and sync history are environment-specific: do not assume an example's production resource ID is published in prelive. Bootstrap returns only public resources matching your filter. A snapshot request for a resource that is not public returns `snapshot_not_found` (`404`).

Prelive dataset and canonical Quran core

Prelive is for testing and development, and its Quran content dataset contains only Al-Fatihah (surah 1) and Al-Baqarah (surah 2); see the [Quickstart](https://api-docs.quran.foundation/docs/quickstart/). API feature support does not imply that every resource is published there. The `quran_core:1` contract requires the complete canonical Quran, including all 114 surahs, 6,236 verses, word text, and complete navigation boundaries. It is not a partial two-surah resource. Prelive's limited dataset does not satisfy that contract, so use the complete production resource with approved production access, or test other public prelive resources.

Keep sync tokens, cursors, and local caches separate for each environment. Follow `next_page_url` and `snapshot_url` against the same environment that returned them, using that environment's credentials.

## Terms [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#terms "Direct link to heading")

| Term | Plain meaning |
| --- | --- |
| Resource | One content item your app tracks, such as translation `19`, word-by-word transliteration `60`, tafsir `151`, ayah recitation `10`, chapter recitation `159`, or article `123`. |
| Resource filter | The list of content your app wants to keep in sync, for example `translations:19;tafsirs:151`. |
| Change | One server event telling your app what changed. The API field is called `type`. |
| Full copy | The complete current rows for one resource. The API calls this a `snapshot`. |
| Snapshot URL | A relative API path returned on some changes. Fetch it to replace the full local copy for that one resource. |
| Sync token | A private checkpoint returned by the API. Store it and send it next time to get only newer changes. |
| Sync sequence | A server sequence number for content changes. Mutations expose this as `sequence`. |
| Sync until | The upper sequence bound for one sync run. The API field is called `sync_until_sequence`. |
| Cursor | A temporary page link. Use it only while finishing the current sync request. |

Relative API paths

When `next_page_url` or `snapshot_url` is present and non-null, we return a relative `/api/v4/...` path, such as `/api/v4/resources/sync?cursor=...` or `/api/v4/resources/snapshots/translations/19`. Prefix that path with `https://apis-prelive.quran.foundation/content` for prelive or `https://apis.quran.foundation/content` for production. Always use the environment that returned the path.

## Content Available for Offline Sync [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#content-available-for-offline-sync "Direct link to heading")

Content Sync supports these resource groups: `quran_core`, `mushafs`, `translations`, `word_by_word_translations`, `word_by_word_transliterations`, `tafsirs`, `recitations`, `chapter_recitations`, and `articles`.

If a content resource is available through Content Sync, **Content Sync is the only permitted path for obtaining and maintaining an offline copy** of that resource; do not build an offline copy from regular API responses. Perform a [next sync](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#next-sync) at least every 7 days when connectivity to QF permits and apply all available changes. Previously synced content may remain available during connectivity outages; sync promptly when connectivity returns. See the [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/) for the full storage conditions.

| Resource group | What the full copy contains | Changes included |
| --- | --- | --- |
| `mushafs` | Mushaf metadata, page mappings, and positioned words. Font files and images are not included. | Mushaf, page, and word changes. |
| `quran_core` | Singleton `1`: canonical Uthmani verse text, word-level IndoPak Nastaleeq, IndoPak, and Uthmani Tajweed text, Surah metadata, and Juz/Hizb/Rub-el-Hizb boundaries. No Mushaf-specific pages. | Chapter, verse, word, and boundary row changes. |
| `translations` | Translation rows for the resource. Footnotes are nested inside each translation row. | Translation row changes and footnote-driven translation row updates. |
| `word_by_word_translations` | Word translation rows for an eligible one-word translation resource. | Word translation row changes. |
| `word_by_word_transliterations` | Word transliteration rows for an eligible one-word transliteration resource. | Word transliteration row changes. |
| `tafsirs` | Tafsir rows for the resource. One row can cover several verses; see [Tafsir Records](https://api-docs.quran.foundation/docs/tutorials/content-sync/full-copies-and-recovery/#tafsir-records). | Tafsir row changes. |
| `recitations` | Ayah audio files plus compatible chapter audio files and timing segments for the legacy ayah recitation. | Ayah audio file and compatible chapter audio file and segment changes. |
| `chapter_recitations` | Chapter audio file rows and associated verse and word timing segment rows. | Chapter audio file and segment changes. |
| `articles` | Visible article localizations. | Article localization changes and resource-level refresh, delete, or restore events. |

Supported groups only

If a resource group is not listed above, it is not accepted by this sync endpoint. Use that resource's regular API endpoint for online reads when available, subject to the storage conditions in the [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/).

`word_by_word_translations` and `word_by_word_transliterations` are separate
groups. The translation group remains translation-only (`word_translation`
records). The transliteration group contains approved, shareable one-word
transliteration resources (`word_transliteration` records), such as production
resource `60`.

### Canonical Quran Core and Mushaf Layout [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#canonical-quran-core-and-mushaf-layout "Direct link to heading")

Select `quran_core:1;mushafs:1` for canonical verse text, word-level IndoPak
Nastaleeq, IndoPak, and Uthmani Tajweed text, and navigation boundaries alongside Mushaf-specific
layout. The core snapshot has 114 `chapter`, 6,236 `verse`, 83,665 `word`,
30 `juz`, 60 `hizb`, and 240 `rub_el_hizb` records. Word rows expose
`text_indopak_nastaleeq`, `text_indopak`, and `text_uthmani_tajweed` with
verse, position, location, and character-type identifiers.
`text_indopak_nastaleeq` is the IndoPak text Quran.com uses; it renders
correctly only with the compatible [IndoPak Nastaleeq font file](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/#indopak-nastaleeq-font) (`indopak-nastaleeq-waqf-lazim-v4.2.1`). `text_indopak` is deprecated and
retained for compatibility. Existing sync clients receive
`text_indopak_nastaleeq` on word rows after the resource is re-snapshotted or
backfilled; apply the resulting changes, or take a fresh `quran_core:1`
snapshot, to pick it up. Its `resource_content_id` is `null`. Each row has a `record_type`
and `id`; use `(resource_group, resource_id, record_type, id)` as the local key.
Unlike Mushaf page mapping, `chapters.pages` is not part of Quran core.

### Audio Resource Identities [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#audio-resource-identities "Direct link to heading")

The `recitations` group is the legacy ayah-by-ayah resource, keyed by the
`Recitation.id` used by the regular recitation endpoints. The
`chapter_recitations` group is keyed by the corresponding
`Audio::Recitation.id`. These IDs and groups are distinct even when both
resources use the same underlying resource content.

Chapter-recitation snapshots contain `chapter_audio_file` records and their
associated `audio_segment` verse and word timing records. Incremental file and
segment changes use row mutations; identify each row by
`(resource_group, resource_id, record_type, record_key)`. For backward
compatibility, compatible chapter-file and segment records and mutations for
the selected approved chapter recitation may also be emitted through the linked
legacy `recitations` resource. New clients that want an independently
addressable chapter audio resource should use `chapter_recitations`.

### Mushaf rendering assets [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#mushaf-rendering-assets "Direct link to heading")

Mushaf Content Sync provides Mushaf metadata, page mappings, and positioned words. It does not include font files or Mushaf image files. Font files and Mushaf images obtained through Quran Foundation APIs or documented CDN URLs may be cached or bundled for use in your application if you have an active Developer Console account and credit Quran Foundation; see the [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/) for the full conditions. For font implementation guidance, see the [Font Rendering guide](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/).

## First Sync [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#first-sync "Direct link to heading")

On first sync, ask for the content you want and set `bootstrap=true`. The API returns pages of `RESOURCE_CREATE` changes. Each one includes a `snapshot_url`, which points to the full copy for that resource.

Client appGET /resources/syncGET /resources/snapshotsLocal databasebootstrap=true for translation 19 and transliteration 60RESOURCE\_CREATE changes with snapshot\_urlFetch each full copyrecords for one resourceReplace local rows for that resourcefinal page includes next\_sync\_tokenStore sync token for this resource filterClient appGET /resources/syncGET /resources/snapshotsLocal database

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/sync?bootstrap=true&resources=chapter_recitations:159;mushafs:1;translations:19;tafsirs:151;word_by_word_transliterations:60&per_page=100" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

If `has_more` is `true`, call `next_page_url` until it becomes `false`. Store `next_sync_token` only from the final page.
Fetch and apply any returned `snapshot_url` values before you mark the sync as complete locally.

## Fetching a Full Copy [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#fetching-a-full-copy "Direct link to heading")

A full copy returns all current rows for one resource. For example, a Mushaf full copy returns its metadata, page mappings, and positioned words. Font files and images are not included.

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/snapshots/mushafs/1" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

Client rule: replace all local rows for `mushafs:1` with the `records` array from the response.

Fetch the canonical singleton separately:

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/snapshots/quran_core/1" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

A `verse` record includes `id`, `chapter_id`, `verse_number`, `verse_index`,
`verse_key`, `text_uthmani`, and navigation numbers. Juz/Hizb/Rub-el-Hizb
records include `first_verse_id`, `last_verse_id`, `verses_count`, and
`verse_mapping`. Snapshot rows are ordered by chapter number, verse index, and
then boundary number for each type. Apply row mutations by `record_type` and
`record_key`, and replace the complete resource on `RESOURCE_INVALIDATE`.

For a chapter recitation, use the `Audio::Recitation.id` from the
`chapter_recitations` filter:

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/snapshots/chapter_recitations/159" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

The `records` array contains the complete current chapter-file list for that
recitation. A chapter audio record has this shape:

```json
{
  "record_type": "chapter_audio_file",
  "id": 2001,
  "audio_recitation_id": 159,
  "chapter_id": 1,
  "audio_url": "https://example.com/audio/001.mp3"
}
```

For word-by-word transliteration resource `60`, fetch the same snapshot URL
returned by bootstrap:

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/snapshots/word_by_word_transliterations/60" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

Production resource `60` currently contains 77,429 records. The snapshot
envelope's `records` are ordered by `word_id`, then `id`. Each
`word_transliteration` record has exactly these fields:

```json
{
  "id": 1,
  "resource_content_id": 60,
  "resource_id": 60,
  "word_id": 1,
  "language_id": 38,
  "language_name": "english",
  "text": "bis'mi",
  "updated_at": "2026-08-19T02:43:00Z"
}
```

Here `resource_id == resource_content_id == ResourceContent.id` identifies the
transliteration resource, while `word_id` identifies the Word owner. Replace all local rows for
`word_by_word_transliterations:60` with the returned `records` before storing
the final sync token.

## How Snapshots Relate to Tokens [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#how-snapshots-relate-to-tokens "Direct link to heading")

The `sync_token` is not sent to the snapshot endpoint. The token belongs to `GET /resources/sync` only.

During bootstrap, the link between sync and snapshots is the `RESOURCE_CREATE` mutation:

- `GET /resources/sync?bootstrap=true...` returns `RESOURCE_CREATE` changes.
- Each `RESOURCE_CREATE` includes a `snapshot_url`.
- Your app fetches each `snapshot_url` and replaces local rows for that resource.
- Your app stores the final `next_sync_token` after all returned changes have been applied.
- Later, your app sends that token back to `GET /resources/sync` with the same canonical `resources` filter.

Snapshots are current when fetched. They are not pinned to the exact sequence of the change that asked you to fetch them.

## Next Sync [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#next-sync "Direct link to heading")

After first sync, use the stored `sync_token` with the same `resources` filter. The API returns only newer changes.

Client appGET /resources/syncLocal databasesync\_token=TOKEN and same resources filterNew row changes, deletes, or full-copy requestsApply changesnext\_sync\_token on final pageReplace stored sync tokenClient appGET /resources/syncLocal database

```bash
curl "https://apis.quran.foundation/content/api/v4/resources/sync?sync_token=$SYNC_TOKEN&resources=chapter_recitations:159;mushafs:1;translations:19;tafsirs:151;word_by_word_transliterations:60&per_page=100" \
  -H "x-auth-token: $ACCESS_TOKEN" \
  -H "x-client-id: $CLIENT_ID"
```

## Sequence Fields [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#sequence-fields "Direct link to heading")

`sequence` on a mutation is the server's increasing content-change number for that mutation. Incremental mutations are returned in ascending `sequence` order. Apply them in that order.

`sync_until_sequence` is the server-enforced upper sequence bound for one sync run. Every mutation returned across that run's pages has `sequence <= sync_until_sequence`; clients do not need to filter mutations using this field. If newer changes are committed while your app is paging, they are excluded from the current run and returned during the next sync after your app sends the final `next_sync_token`. Continue using each returned `next_page_url` unchanged.

For example, if a run starts with `sync_until_sequence = 1000`, all of its pages are limited to mutations through sequence `1000`. Changes `1001` and later will be returned by the next sync.

`sync_sequence` on a snapshot response is the current server sequence when the snapshot was fetched. Because snapshots are current when fetched, this value may be greater than the active run's `sync_until_sequence`. Do not use either sequence field as your next checkpoint. Only store `next_sync_token` from the final sync page.

## Mutation Types [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#mutation-types "Direct link to heading")

| Type | Client action |
| --- | --- |
| `RESOURCE_CREATE` | Fetch `snapshot_url`, then replace all local rows for that resource. |
| `RESOURCE_INVALIDATE` | Fetch `snapshot_url`, then replace all local rows for that resource. |
| `RESOURCE_DELETE` | Remove or hide the full local resource. |
| `RESOURCE_UPDATE` | Keep existing rows. Treat it as a resource-level freshness marker. |
| `ROW_CREATE` | Upsert one local row using `resource_group`, `resource_id`, `record_type`, and `record_key`. |
| `ROW_UPDATE` | Upsert one local row using `resource_group`, `resource_id`, `record_type`, and `record_key`. |
| `ROW_DELETE` | Delete one local row using `resource_group`, `resource_id`, `record_type`, and `record_key`. |

Only `RESOURCE_CREATE` and `RESOURCE_INVALIDATE` include `snapshot_url`.

## Testing Sync Behavior [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#testing-sync-behavior "Direct link to heading")

You can test bootstrap and snapshot fetches with real public resources. To test pagination, use a `resources` filter that returns more items than `per_page`. To observe a no-change incremental sync, call sync again with the final `next_sync_token` when no matching content changes have occurred.

Mutation scenarios such as row updates, deletes, resource deletes, restores, and invalidations require actual content changes on tracked resources. The public API does not expose a way to force those events on demand.

## API References [​](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/\#api-references "Direct link to heading")

- [Sync public content resources](https://api-docs.quran.foundation/docs/content_apis_versioned/resources-sync/)
- [Get content resource snapshot](https://api-docs.quran.foundation/docs/content_apis_versioned/resources-snapshot/)

- [Environments and Resource Availability](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#environments-and-resource-availability)
- [Terms](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#terms)
- [Content Available for Offline Sync](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#content-available-for-offline-sync)
  - [Canonical Quran Core and Mushaf Layout](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#canonical-quran-core-and-mushaf-layout)
  - [Audio Resource Identities](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#audio-resource-identities)
  - [Mushaf rendering assets](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#mushaf-rendering-assets)
- [First Sync](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#first-sync)
- [Fetching a Full Copy](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#fetching-a-full-copy)
- [How Snapshots Relate to Tokens](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#how-snapshots-relate-to-tokens)
- [Next Sync](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#next-sync)
- [Sequence Fields](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#sequence-fields)
- [Mutation Types](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#mutation-types)
- [Testing Sync Behavior](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#testing-sync-behavior)
- [API References](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/#api-references)