import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  checkAdminAuth,
  createAdminSessionToken,
  verifyAdminPassword
} from "./adminAuth.js";

function resetAdminEnv() {
  process.env.NODE_ENV = "production";
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD_SHA256;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_API_TOKEN;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

test("rejects admin auth in production when nothing is configured", () => {
  resetAdminEnv();

  const result = checkAdminAuth(new Request("http://localhost/test"));
  assert.equal(result.ok, false);
  assert.equal(result.status, 500);
});

test("verifies configured admin username and password hash", () => {
  resetAdminEnv();
  process.env.ADMIN_USERNAME = "owner";
  process.env.ADMIN_PASSWORD_SHA256 = sha256("correct-password");
  process.env.ADMIN_SESSION_SECRET = "session-secret";

  const result = verifyAdminPassword("owner", "correct-password");
  assert.equal(result.ok, true);
});

test("rejects invalid admin password", () => {
  resetAdminEnv();
  process.env.ADMIN_USERNAME = "owner";
  process.env.ADMIN_PASSWORD_SHA256 = sha256("correct-password");
  process.env.ADMIN_SESSION_SECRET = "session-secret";

  const result = verifyAdminPassword("owner", "wrong-password");
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test("accepts signed admin session cookie", () => {
  resetAdminEnv();
  process.env.ADMIN_USERNAME = "owner";
  process.env.ADMIN_PASSWORD_SHA256 = sha256("correct-password");
  process.env.ADMIN_SESSION_SECRET = "session-secret";

  const token = createAdminSessionToken("owner");
  const request = new Request("http://localhost/test", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, true);
});

test("keeps x-admin-token compatibility for server-side admin operations", () => {
  resetAdminEnv();
  process.env.ADMIN_API_TOKEN = "secret-token";

  const request = new Request("http://localhost/test", {
    headers: { "x-admin-token": "secret-token" }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, true);
});

test("rejects invalid admin token when password login is configured", () => {
  resetAdminEnv();
  process.env.ADMIN_USERNAME = "owner";
  process.env.ADMIN_PASSWORD = "correct-password";
  process.env.ADMIN_SESSION_SECRET = "session-secret";
  process.env.ADMIN_API_TOKEN = "secret-token";

  const request = new Request("http://localhost/test", {
    headers: { "x-admin-token": "wrong-token" }
  });

  const result = checkAdminAuth(request);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});
