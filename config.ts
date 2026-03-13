import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export interface LayrConfig {
  ports: {
    backend: number;
    editor: number;
    preview: number;
  };
}

const configDir = dirname(fileURLToPath(import.meta.url));
const configPath = join(configDir, 'layr.yaml');
const raw = readFileSync(configPath, 'utf8');
export const config: LayrConfig = parse(raw);
