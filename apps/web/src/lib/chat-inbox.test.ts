import assert from "node:assert/strict";
import test from "node:test";
import { inboxItems, unreadMessages } from "./chat-inbox";
import type { ConversationListItem } from "./chat-api";

test("reading a personal booking only clears that inbox's unread badge", () => {
  const items = [{ id: "booking", inboxScope: "personal", _count: { messages: 2 } },
    { id: "lead", inboxScope: "organization", _count: { messages: 3 } },
    { id: "older", inboxScope: "other", _count: { messages: 1 } }] as ConversationListItem[];
  assert.equal(unreadMessages(items, "all"), 6);
  assert.deepEqual(inboxItems(items, "organization").map(c => c.id), ["lead"]);
  items[0]._count.messages = 0;
  assert.equal(unreadMessages(items, "personal"), 0);
  assert.equal(unreadMessages(items, "organization"), 3);
  assert.equal(unreadMessages(items, "all"), 4);
});
