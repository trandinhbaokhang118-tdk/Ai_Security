import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";

const target = path.resolve(process.argv[2] || "artifacts");
const output = path.join(target, "SHA256SUMS.txt");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const current = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(current));
    else if (current !== output) files.push(current);
  }
  return files;
}

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

const files = await walk(target);
if (!files.length) throw new Error(`No artifacts found in ${target}`);
const lines = [];
for (const file of files) {
  lines.push(`${await sha256(file)}  ${path.relative(target, file).replaceAll("\\", "/")}`);
}
await fs.writeFile(output, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${lines.length} checksums to ${output}`);
