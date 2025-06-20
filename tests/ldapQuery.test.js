import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { search } from '../src/server/lib/ldapService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsPath = path.join(__dirname, '../src/server/data/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const baseDN = settings.activeDirectorySettings.baseDN;

const filter = '(&(objectClass=user)(sAMAccountName=*widji.santoso*))';

test('ldap query returns entries', async () => {
  const entries = await search(baseDN, filter, ['sAMAccountName', 'displayName']);
  console.log(entries);
  assert.ok(Array.isArray(entries));
});
