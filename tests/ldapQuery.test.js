import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAdUserInfo } from '../src/server/routes/active-directory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsPath = path.join(__dirname, '../src/server/data/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

test('getAdUserInfo retrieves data', async () => {
  const info = await getAdUserInfo(settings.activeDirectorySettings, 'widji.santoso');
  console.log(info);
  assert.equal(typeof info, 'object');
});
