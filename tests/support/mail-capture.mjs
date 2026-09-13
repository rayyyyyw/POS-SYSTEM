// Loaded only by the disposable QA server, never by the application build.
import assert from "node:assert/strict";
import { createServer } from "node:http";

const database = new URL(process.env.DATABASE_URL);
assert.match(database.searchParams.get("schema") ?? "", /^pos_test_[a-f0-9]{24}$/);
assert.equal(process.env.POS_TEST_MAIL_CAPTURE, "1");
assert.equal(process.env.RESEND_API_KEY, "disposable-test-key");

const messages = [];
let failDelivery = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== "https://api.resend.com/emails") return originalFetch(input, init);
  const message = JSON.parse(String(init?.body));
  assert.ok(message.to.every(address => address.endsWith("@example.test")), "Only disposable recipients are permitted.");
  if (failDelivery) return Response.json({ message: "Deliberate test delivery failure" }, { status: 503 });
  messages.push(message);
  return Response.json({ id: `test-message-${messages.length}` });
};

const mailbox = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method === "GET" && request.url === "/messages") {
    response.end(JSON.stringify(messages));
  } else if (request.method === "POST" && request.url === "/failure") {
    let body = "";
    for await (const chunk of request) body += chunk;
    failDelivery = JSON.parse(body).enabled === true;
    response.end(JSON.stringify({ enabled: failDelivery }));
  } else {
    response.writeHead(404).end("{}");
  }
});
mailbox.listen(0, "127.0.0.1", () => {
  console.log(`POS_TEST_MAILBOX=http://127.0.0.1:${mailbox.address().port}`);
});
