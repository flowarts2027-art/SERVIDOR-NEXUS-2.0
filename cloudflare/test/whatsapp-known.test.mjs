import test from "node:test";
import assert from "node:assert/strict";
import { phoneKey, clientNumbers, knownCustomerPrompt } from "../src/whatsapp-known.js";

test("phoneKey matches numbers with or without 55 and the ninth digit", () => {
  assert.equal(phoneKey("(21) 98888-7777"), phoneKey("552188887777"));
  assert.equal(phoneKey("5521988887777"), phoneKey("21988887777"));
  assert.notEqual(phoneKey("5521988887777"), phoneKey("5511988887777"));
  assert.equal(phoneKey("123"), "");
});

test("clientNumbers reads agentProfile and contact fields", () => {
  assert.deepEqual(clientNumbers({ agentProfile: { whatsapp: "21988887777" }, contact: { phone: "" } }), [phoneKey("21988887777")]);
  assert.deepEqual(clientNumbers("{bad json"), []);
});

test("streaming prompt never sells and calls Rodrigo for recharge", () => {
  const text = knownCustomerPrompt({ customerType: "streaming" });
  assert.match(text, /needsHuman=true/);
  assert.match(text, /Não ofereça/);
  assert.equal(knownCustomerPrompt({}), "");
});
