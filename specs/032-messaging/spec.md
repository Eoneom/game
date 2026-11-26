# Slice 032 — Messaging: mail and chat

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Domain | `core/communication/` (mail, chat, block, abuse report) |
| Commands / queries | `app/command/communication/{mail,chat,block,abuse-report}/`, `app/query/communication/{mail,chat,block}/` |
| HTTP | `web/handler/communication/{mail,chat,block,abuse-report}/`, `web/handler/player/search.ts` |
| Realtime | `core/events.ts`, `web/ws.ts` |
| Jobs | `adapter/job-queue/communication/cleanup-chat.ts` |
| Web | `modules/communication/mail/`, `modules/communication/chat/`, `routes/inbox/mail.tsx`, shell layout |
