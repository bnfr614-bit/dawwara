// Uses SQLite locally and PostgreSQL in production, from one schema file:
// when DATABASE_URL is a postgres URL, a copy of the schema with the postgres provider is generated and pushed.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const url = process.env.DATABASE_URL || '';
const isPg = /^postgres(ql)?:\/\//.test(url);
let schema = 'prisma/schema.prisma';

if (isPg) {
  const src = readFileSync(schema, 'utf8').replace('provider = "sqlite"', 'provider = "postgresql"');
  schema = 'prisma/schema.pg.prisma';
  writeFileSync(schema, src);
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run(`npx prisma generate --schema ${schema}`);
if (isPg) run(`npx prisma db push --skip-generate --schema ${schema}`);
console.log(`database ready (${isPg ? 'postgresql' : 'sqlite'})`);
