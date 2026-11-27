# Slice 032 — Messaging: mail and chat

**Status**: Implemented on `main` (slice 032): letters (`core/communication/mail/`, `/communication/mail`), global and faction chat with WS fan-out (`chat:message`), player blocking, abuse reports, in-memory rate limits (HTTP 429), `GET /player/search`, daily `communication.chat.cleanup` job, web Courrier tab (`/inbox/mail`) and chat panel, migration `00014_messaging`.

## Summary

Add player-to-player communication next to the existing reports ([`012`](../012-communication-reports/spec.md)):

- **Mail** (*courrier*): letters with a **subject and body**, sent to **any human player** by name. "Reply" creates a new letter.
- **Chat**: real-time channels **global** and **faction**. The **alliance** channel comes with slice `033`.
- **Basic protection** right away: rate limits and length caps, **blocking** a player, **reporting** a message. Full moderation belongs to the security pass (slice `038`).

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`002`](../002-player-session-auth/spec.md) (players, session), [`004`](../004-faction-domain/spec.md) (faction channel), [`012`](../012-communication-reports/spec.md) (inbox), [`017`](../017-realtime-websocket/spec.md) (WebSocket fan-out), [`019`](../019-web-shell-routing/spec.md) (web shell).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Mail model** | Letters with subject + body; reply = new letter (subject prefilled "Re: …"), linked by `in_reply_to`. No threads. |
| **Recipients** | Any **human** player, any faction. System players cannot receive mail. |
| **Chat channels** | `global` (all human players), `faction` (own faction only). Alliance channel in `033`. |
| **Chat retention** | **30 days**, then deleted by a scheduled job. |
| **Anti-abuse now** | Rate limits and length caps, block a player, report a message. |
| **Chat UI** | **Collapsible panel** at the bottom of every page, one tab per channel. |

## Vocabulary

Add to `CONTEXT.md`:

> **Letter**: A private message with a subject, sent by one Player to another.
> _Avoid_: mail item, email, DM
>
> **Chat channel**: A real-time conversation shared by a set of Players (global, faction, alliance).
> _Avoid_: room, lobby

## Mail

### Rules

| Rule | Value / error |
| --- | --- |
| Subject | 1–120 characters, trimmed. `communication:subject-invalid` |
| Body | 1–5000 characters. `communication:body-invalid` |
| Recipient exists (by name) | `communication:recipient-not-found` |
| Not yourself | `communication:recipient-is-self` |
| Not system-controlled | `communication:recipient-system` |
| Rate limit | 1 letter per 10 s per sender. `communication:rate-limited` (HTTP 429) |
| Recipient blocked the sender | The letter is stored in the sender's sent box but **not delivered**; the sender is not told. |

### HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/communication/mail` | Send `{ recipient_name, subject, body, in_reply_to? }` |
| `GET` | `/communication/mail?box=inbox\|sent&page=` | Paginated list (newest first) |
| `GET` | `/communication/mail/:mail_id` | Detail; marks read when the caller is the recipient |
| `GET` | `/communication/mail/unread/count` | Unread inbox count |
| `PUT` | `/communication/mail/mark` | Mark read / unread |
| `DELETE` | `/communication/mail/:mail_id` | Delete for the caller only (soft delete per side) |
| `GET` | `/player/search?q=` | Human players whose name starts with `q` (≥ 2 chars, max 10), for recipient autocomplete |

Errors: `communication:mail-not-found`, `communication:mail-not-owner` (caller is neither sender nor recipient, or deleted it).

A row whose sender and recipient have both deleted it is purged by the cleanup job.

### Events

WS `mail:received` `{ mail_id }` to the recipient when delivered.

## Chat

### Rules

| Rule | Value / error |
| --- | --- |
| Channel access | `global`: every human player. `faction`: the player's own faction. `communication:channel-forbidden` otherwise. |
| Body | 1–500 characters, trimmed. `communication:body-invalid` |
| Rate limit | 1 message per 2 s per player per channel. `communication:rate-limited` (HTTP 429) |
| Authors | Human players only; system players never post. |
| Retention | Messages older than **30 days** are deleted. |

Channel identifiers on the wire: `global`, `faction` (the server resolves the caller's faction). Stored as `global` or `faction:<faction_code>`.

### HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/communication/chat/:channel?before=<message_id>&limit=50` | History, newest first, max 100 per page |
| `POST` | `/communication/chat/:channel` | Post `{ body }` |

Both filter out messages from players the caller has blocked.

### Real-time fan-out

On post, the server sends WS `chat:message` `{ channel, message: { id, author: { id, name, faction_code }, body, created_at } }` to every **connected** player allowed in the channel, **except** players who blocked the author. Connections are the in-memory map of [`017`](../017-realtime-websocket/spec.md) (single server process).

No unread counter on the server; the web shows an activity dot on a collapsed panel or inactive tab.

## Block a player

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/communication/block` | Block `{ player_name }` |
| `DELETE` | `/communication/block/:player_id` | Unblock |
| `GET` | `/communication/block` | List blocked players |

Effects for the **blocker**: letters from the blocked player are not delivered, and the blocked player's chat messages are hidden (history and live). The blocked player is not told. Blocking yourself or a system player is rejected (`communication:block-invalid`).

## Report a message

`POST /communication/abuse-report` `{ kind: 'mail' | 'chat', message_id, reason? }` (reason ≤ 500 characters).

- Stores the reporter, the author, a **snapshot of the content** (so chat cleanup does not erase it), the reason and the date.
- The reporter must be able to see the message: recipient of the letter, or allowed in the chat channel.
- One report per reporter and message; duplicates return success without a new row.
- No admin interface in this slice (security pass `038`).

## Rate limiting

In-memory sliding window per process (single server today), keyed by player and scope (`mail`, `chat:<channel>`). Moving to a shared store is part of the security pass.

## Background job

`communication.chat.cleanup` (daily, `singletonKey` = `global`): delete chat messages older than 30 days, and letters deleted by both sides. Boot: `ensureChatCleanupScheduled`, like the report cleanup.

## Web UI

| Surface | Change |
| --- | --- |
| Inbox | New **Courrier** tab next to Rapports (`/inbox/mail`): Reçus / Envoyés, read view, **Répondre**, **Supprimer**, **Signaler**, compose form with recipient autocomplete. Unread badge. Toast on `mail:received`. |
| Blocked players | List with unblock, reachable from the Courrier tab. |
| Chat panel | Collapsible bottom panel on every authenticated page. Tabs **Global** and **Faction**; history with "charger plus"; input with counter (500). Each message shows author, faction color and time. Author menu: **Écrire** (opens compose), **Bloquer**, **Signaler**. Open state and active tab kept in local storage. |
| Errors | French copy for every new error, including rate limit ("Trop de messages, patientez"). |

## Persistence

Migration (next free number):

| Table | Columns |
| --- | --- |
| `mail` | `id`, `sender_id`, `recipient_id`, `subject`, `body`, `in_reply_to` (nullable), `delivered` (bool), `sent_at`, `read_at` (nullable), `deleted_by_sender`, `deleted_by_recipient`; indexes `(recipient_id, sent_at)`, `(sender_id, sent_at)` |
| `chat_message` | `id`, `channel`, `author_id`, `body`, `created_at`; index `(channel, created_at)` |
| `player_block` | `blocker_id`, `blocked_id`, `created_at`; primary key `(blocker_id, blocked_id)` |
| `abuse_report` | `id`, `reporter_id`, `author_id`, `kind`, `message_id`, `content`, `reason`, `created_at`; unique `(reporter_id, kind, message_id)` |

## Testing

| Area | Cases |
| --- | --- |
| Mail | Validation errors; system recipient rejected; delivery and `mail:received`; blocked sender not delivered; soft delete per side; purge when both deleted; reply link. |
| Chat | Faction channel forbidden across factions; history pagination; fan-out excludes blockers and other factions; 30-day cleanup. |
| Rate limit | Second message within the window → 429; separate windows per channel. |
| Block | Hidden history and live messages; cannot block self or system player. |
| Report | Snapshot stored; must see the message; duplicate is idempotent. |
| Player search | Prefix match, humans only, max 10. |

## Out of scope

- Alliance channel (slice `033`).
- Moderation tools, admin review of reports, bans, word filters (slice `038`).
- Group conversations, attachments, message editing.
- Push or email notifications outside the game.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`012`](../012-communication-reports/spec.md) | Remove "player-to-player messaging" from out of scope; link this slice. |
| [`017`](../017-realtime-websocket/spec.md) | `mail:received`, `chat:message` and multi-recipient fan-out. |
| [`019`](../019-web-shell-routing/spec.md) | `/inbox/mail` route, chat panel in the shell. |
| `CONTEXT.md` | **Letter**, **Chat channel**. |

## Implementation notes

- **Validation order** (`sendCommunicationMail`): subject, body, recipient (by exact name, trimmed; missing or unknown → `communication:recipient-not-found`), self, system, `in_reply_to`, block lookup, then the rate limit. Only a letter that passes every check uses the sender's 10 s window. Chat: channel, body, then the 2 s window. The mail body is not trimmed (line breaks matter) but a blank body is `communication:body-invalid`; subject and chat body are trimmed as specified.
- **`in_reply_to`**: must be a letter the sender can still see (either side, not deleted); otherwise `communication:mail-not-found` / `communication:mail-not-owner`. The column is a nullable foreign key `ON DELETE SET NULL`, so purging the original keeps the reply.
- **Visibility**: the sender sees a letter until they delete it; the recipient sees it only when `delivered` and not deleted. Detail, mark and delete answer `communication:mail-not-owner` otherwise (also for the recipient of an undelivered letter, so blocking stays invisible). Only the recipient can mark read / unread (`PUT /communication/mail/mark` `{ mail_id, was_read }`, same shape as reports). The detail query marks the letter read itself (`read_at` keeps the first read date).
- **Sender view**: list and detail items carry `sender` / `recipient` `{ id, name, faction_code }`; `was_read` is the recipient's state and always `true` for the sender, so there are no read receipts and an undelivered letter looks like any other sent letter. `delivered` is never on the wire.
- **List**: `GET /communication/mail?box=inbox|sent&page=` (any other `box` → inbox), 10 per page, newest first (`sent_at`, then `id`), `{ mails, total, page_size }` like reports.
- **Purge**: the cleanup job deletes letters with `deleted_by_sender` and (`deleted_by_recipient` or not `delivered`): an undelivered letter has no recipient side, so it goes once its sender deletes it.
- **Chat history**: `GET /communication/chat/:channel?before=&limit=` returns `{ messages, has_more, viewer_player_id }`. `has_more` (one extra row fetched) drives « charger plus »; `viewer_player_id` lets the panel hide the author menu on the caller's own messages (both are additions to the spec). `before` compares `(created_at, id)` with the cursor row in the same channel; an unknown or malformed cursor returns an empty page. `limit` is clamped to 1–100, default 50. Unknown channels (`alliance`, …) are `communication:channel-forbidden`.
- **Post**: returns the stored message (same shape as the WS payload). The author also receives the `chat:message` event; the web dedupes by id.
- **Fan-out**: `postCommunicationChatMessage` emits after the transaction with the channel faction (`null` for global) and the author's blockers. `ws.ts` keeps a second in-memory map `player_id → faction_code`, filled once per connection (`getPlayerFactionCode`; a Faction never changes); if that lookup fails the connection still gets everything except faction chat. `sendToGamePlayers` is the multi-recipient helper.
- **Block**: `POST /communication/block` is idempotent and answers `{ blocked_id }`; an unknown name is `player:not-found`. `DELETE /communication/block/:player_id` is idempotent. `GET` lists `{ players: [{ id, name, faction_code, blocked_at }] }`, most recent first.
- **Abuse report**: mail → the reporter must be the recipient of a delivered letter (a letter they deleted stays reportable); chat → the reporter must be allowed in the message's stored channel. Content snapshot: the chat body, or `"<subject>\n\n<body>"` for a letter. `reason` is trimmed (blank → `null`); over 500 characters is `communication:reason-invalid` (new code). A missing chat message is `communication:chat-message-not-found` (new code). Duplicates use `ON CONFLICT DO NOTHING` on the unique key. `abuse_report.message_id` has no foreign key so snapshots survive cleanup.
- **Request errors**: new `RequestError` codes `mail_id:not-found`, `message_id:not-found`, `kind:not-found` (unknown kind), `player_id:not-found` (HTTP 400). Malformed ids are rejected before Postgres sees them (`isId` in `shared/identification.ts`): not-found errors, or a no-op for unblock.
- **HTTP 429**: the error middleware maps `communication:rate-limited` to status 429 (body unchanged: `{ status: 'nok', error_code }`); every other error keeps 200. The API client parses the JSON whatever the status.
- **Rate limiter**: `RateLimiterInMemory` (`adapter/rate-limiter.ts`, port `app/port/rate-limiter.ts`, `Factory.getRateLimiter()`), keys `<player_id>:mail` and `<player_id>:chat:<stored channel>`, injectable `clock`. Rejected hits are not recorded.
- **Player search**: case-insensitive prefix (`ILIKE`, `%`, `_` and `\` escaped), humans only, sorted by name, at most 10; under 2 characters (after trimming) answers an empty list. The caller is not excluded.
- **Web Courrier**: `/inbox/mail` search params `box`, `mail_id`, `view` (`compose` | `blocked`), `to`, `reply_to`. A « Rapports / Courrier » tab strip sits on top of both inbox pages and the nav menu gains « Courrier (n) ». « Répondre » prefills the other side of the letter and « Re: <subject> » (no stacked prefix, cut to 120). Reason prompts use `window.prompt`; delete and block ask `window.confirm`. « Marquer non lu » is offered in the inbox.
- **Web chat panel**: `ChatPanel` sits between the app body and the FX layer in `App.tsx`. History is a React Query infinite query per channel; live messages and posts are prepended to the cached first page. The activity dot appears on the collapsed header and on an inactive tab for messages from other players. `localStorage` access is wrapped (`chat/storage.ts`), so the panel works when storage is missing (jsdom) or throws. `wsClient.on` now returns an unsubscribe function. Faction colors: `modules/faction/color.ts`.

## Follow-ups

- **Moderation**: abuse reports are stored only; review tools, bans and filters belong to slice `038`, as does moving the rate limiter to a shared store.
- **Alliance channel**: slice `033` adds a third channel (`ChatChannel`, stored key, access rule, panel tab).
- **Mail notifications**: the toast on `mail:received` does not open the letter; consider a link like the battle report toast.
- **Reason input**: replace `window.prompt` / `window.confirm` with in-game dialogs when the UI kit has one.
- **Multi-tab**: the WS connection map holds one socket per player (slice 017), so a second tab steals live chat from the first.

## Evidence index

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/communication/error.ts`, `service.ts` (+ `service.spec.ts`), `constant/limits.ts`, `mail/entity.ts` (+ `entity.spec.ts`), `chat/channel.ts`, `chat/entity.ts`, `abuse-report/entity.ts`, `abuse-report/kind.ts` |
| Commands | `apps/server/src/app/command/communication/rate-limit.ts`, `mail/send.ts`, `mail/mark.ts`, `mail/delete.ts`, `chat/post.ts`, `chat/cleanup.ts`, `block/block.ts`, `block/unblock.ts`, `abuse-report/create.ts` (+ their `.spec.ts`: validation, system recipient, delivery and `mail:received`, blocked sender, reply link, soft delete per side, rate limits and separate windows per channel, fan-out payload, 30-day cleanup and purge, snapshot / visibility / duplicate) |
| Queries | `apps/server/src/app/query/communication/mail/list.ts`, `get.ts` (+ `get.spec.ts`), `count-unread.ts`, `participants.ts`, `chat/history.ts` (+ `history.spec.ts`: pagination, limits), `block/list.ts` (+ spec), `apps/server/src/app/query/player/search.ts` (+ spec), `player/faction.ts` |
| Persistence | `apps/server/src/adapter/database/migrations/00014_messaging.ts`, `apps/server/src/adapter/database/types.ts` (`Mail`, `ChatMessage`, `PlayerBlock`, `AbuseReport`), `apps/server/src/adapter/database/repository/{mail,chat-message,player-block,abuse-report}.ts`, `player.ts` (`searchHumansByNamePrefix`), `index.ts`, `apps/server/src/app/port/repository/{mail,chat-message,player-block,abuse-report,player,generic}.ts`. Verified locally against Postgres (in a rolled-back transaction): prefix search with escaping and system players excluded, inbox / sent boxes and unread count, both purge cases, history pages with the `(created_at, id)` cursor and blocked authors hidden, idempotent block / unblock, duplicate abuse report ignored; migration down / up |
| Rate limit | `apps/server/src/app/port/rate-limiter.ts`, `apps/server/src/adapter/rate-limiter.ts` (+ `rate-limiter.spec.ts`), `apps/server/src/adapter/factory.ts`, `apps/server/src/web/middleware/error.ts` (+ `error.spec.ts`: 429) |
| HTTP | `apps/server/src/web/handler/communication/mail/{send,list,get,count-unread,mark,delete,mapper}.ts` (+ `list.spec.ts`), `chat/{history,post}.ts`, `block/{create,delete,list}.ts`, `abuse-report/create.ts` (+ spec), `apps/server/src/web/handler/player/search.ts`, `apps/server/src/web/router.ts`, `apps/server/src/shared/identification.ts` (`isId`) |
| Realtime | `apps/server/src/core/events.ts`, `apps/server/src/app/event-bus.ts`, `apps/server/src/web/ws.ts` (+ `ws.spec.ts`: `mail:received`, fan-out excludes blockers and other factions) |
| Jobs | `apps/server/src/adapter/job-queue/communication/cleanup-chat.ts`, `job-queue.ts`, `index.ts`, `register-workers.ts`, `apps/server/src/app/port/job-queue.ts`, `apps/server/src/app/scheduling/intervals.ts`, `apps/server/src/index.ts` (`ensureChatCleanupScheduled`) |
| API | `packages/api-client/src/endpoints/communication/{mail,chat,block,abuse-report}/`, `communication/index.ts`, `player/search.ts`, `player/index.ts`, `endpoints/index.ts`, `fetcher.ts` (`delete`), `events.ts` (`MailReceivedEventPayload`, `ChatMessageEventPayload`), `error/request.ts`, `index.ts` (`ChatChannel`, `AbuseReportKind`, limits) |
| Web | `apps/web/src/modules/communication/mail/` (`page.tsx`, `list.tsx`, `details.tsx`, `compose.tsx`, `hooks.ts`, `reply.ts` + test), `communication/chat/` (`panel.tsx` + test, `hooks.ts`, `storage.ts` + test, `ws-listener.ts`), `communication/block/` (`list.tsx`, `hooks.ts`), `communication/abuse-report/hooks.ts`, `communication/inbox-tabs.tsx`, `communication/page.tsx`, `communication/ws-listener.ts`, `apps/web/src/routes/inbox/mail.tsx`, `apps/web/src/App.tsx`, `apps/web/src/ui/nav/menu/index.tsx`, `apps/web/src/modules/faction/color.ts`, `apps/web/src/helpers/websocket.ts` (+ test), `apps/web/src/helpers/error-translations.ts` |
