import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(), 
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error('Invalid environment variables:', JSON.stringify(z.treeifyError(_env.error), null, 2));
  process.exit(1);
}
export const env = _env.data;
export type Env = typeof env;
