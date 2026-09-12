import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertInvitation,
  assertOwnerMutation,
  assertTransition,
  DomainError,
} from "../lib/domain/policies";

test("restaurant lifecycle permits only the supported transitions", () => {
  const transitions = {
    PENDING: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: ["PENDING"],
  };

  for (const [from, allowed] of Object.entries(transitions)) {
    for (const to of Object.keys(transitions)) {
      if (allowed.includes(to)) {
        assert.doesNotThrow(() => assertTransition(from, to));
      } else {
        assert.throws(() => assertTransition(from, to), DomainError);
      }
    }
  }
  assert.throws(() => assertTransition("UNKNOWN", "ACTIVE"), DomainError);
  assert.throws(() => assertTransition("ACTIVE", "UNKNOWN"), DomainError);
});

test("invitations expire at their exact expiry time and cannot be reused", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");
  assert.doesNotThrow(() => assertInvitation({
    status: "PENDING",
    expiresAt: new Date(now.getTime() + 1),
  }, now));

  for (const invite of [
    null,
    { status: "PENDING", expiresAt: now },
    { status: "PENDING", expiresAt: new Date(now.getTime() - 1) },
    { status: "ACCEPTED", expiresAt: new Date(now.getTime() + 1000) },
    { status: "REVOKED", expiresAt: new Date(now.getTime() + 1000) },
  ]) {
    assert.throws(() => assertInvitation(invite, now), DomainError);
  }
});

test("ordinary membership edits cannot demote or disable the owner", () => {
  assert.throws(() => assertOwnerMutation("OWNER"), DomainError);
  assert.doesNotThrow(() => assertOwnerMutation("MANAGER"));
  assert.doesNotThrow(() => assertOwnerMutation("CASHIER"));
});
