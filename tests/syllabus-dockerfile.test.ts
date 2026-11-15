import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { expect, it } from 'vitest';

// The reader image copies an explicit file list. A new local import that is not
// copied crashes the hosted reader at startup (seen 2026-11-14), so check the list.
const root = resolve(__dirname, '..');

function copiedFiles() {
  const dockerfile = readFileSync(join(root, 'services/syllabus/Dockerfile'), 'utf8');
  return new Set(
    [...dockerfile.matchAll(/^COPY (src\/.+) \.\/src\/.*$/gm)].flatMap((m) => m[1].split(/\s+/)),
  );
}

function resolveImport(from: string, spec: string) {
  const base = spec.startsWith('@/')
    ? join(root, 'src', spec.slice(2))
    : resolve(dirname(from), spec);
  return [`${base}.ts`, `${base}.tsx`, base, join(base, 'index.ts')].find(
    (file) => existsSync(file) && statSync(file).isFile(),
  );
}

it('reader Docker image copies every local file the reader imports', () => {
  const copied = copiedFiles();
  const service = join(root, 'services/syllabus');
  const queue = readdirSync(service)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(service, name));
  const seen = new Set<string>();
  const missing: string[] = [];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/from '((?:\.{1,2}|@)\/[^']+)'/g)) {
      const target = resolveImport(file, spec);
      if (!target) {
        missing.push(`unresolved ${spec} in ${relative(root, file)}`);
        continue;
      }
      const path = relative(root, target).replaceAll('\\', '/');
      if (!path.startsWith('services/syllabus/') && !copied.has(path))
        missing.push(`${path} (imported by ${relative(root, file).replaceAll('\\', '/')})`);
      queue.push(target);
    }
  }
  expect(missing).toEqual([]);
});
