import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSenderEmail } from '../src/server/utils/emailUtils.js';

const defaultEmail = 'default@example.com';
const graphBase = { senderEmail: defaultEmail, useLoggedInUserAsSender: false };
const adSettings = { enabled: true };

// helper stub
const stubInfo = mail => async () => ({ mail });

test('returns default sender when feature disabled', async () => {
  const req = { user: { username: 'jdoe' } };
  const email = await resolveSenderEmail(graphBase, adSettings, req, stubInfo('user@example.com'));
  assert.equal(email, defaultEmail);
});

test('returns AD email when enabled and lookup succeeds', async () => {
  const req = { user: { username: 'jdoe' } };
  const graph = { ...graphBase, useLoggedInUserAsSender: true };
  const email = await resolveSenderEmail(graph, adSettings, req, stubInfo('user@example.com'));
  assert.equal(email, 'user@example.com');
});

test('falls back to default when lookup fails', async () => {
  const req = { user: { username: 'jdoe' } };
  const graph = { ...graphBase, useLoggedInUserAsSender: true };
  const failing = async () => { throw new Error('lookup error'); };
  const email = await resolveSenderEmail(graph, adSettings, req, failing);
  assert.equal(email, defaultEmail);
});
