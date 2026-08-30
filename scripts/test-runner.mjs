import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const tests = [];
let suite = [];
let timeoutMs = 10_000;

globalThis.describe = (name, define) => {
  suite.push(name);
  define.call({ timeout(milliseconds) { timeoutMs = milliseconds; } });
  suite.pop();
};

globalThis.it = (name, test) => {
  tests.push({ name: [...suite, name].join(' > '), test });
};

for (const file of process.argv.slice(2)) {
  await import(pathToFileURL(path.resolve(file)).href);
}

let failed = 0;
for (const { name, test } of tests) {
  try {
    if (test.length > 0) {
      await new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) reject(new Error(`Timed out after ${timeoutMs} ms`));
        }, timeoutMs);
        test((error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      });
    } else {
      await test();
    }
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`${tests.length} tests passed`);
}
