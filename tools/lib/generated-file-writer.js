import fs from "node:fs";
import path from "node:path";

const observers = new Set();

export function observeGeneratedFiles(observer) {
  observers.add(observer);
  return () => observers.delete(observer);
}

export function writeGeneratedFile(filePath, content) {
  const expected = Buffer.from(content);
  const unchanged = fs.existsSync(filePath) && fs.readFileSync(filePath).equals(expected);
  if (!unchanged) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, expected);
  }
  // Report the generator's computed bytes, including deliberate no-write outputs.
  for (const observer of observers) observer({ path: path.resolve(filePath), expected: Buffer.from(expected), unchanged });
}
