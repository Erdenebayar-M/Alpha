import { z } from 'zod';
import { env } from '../config/env';

// Only allow relative /content/ paths (local serve) or the configured R2 CDN origin.
// This prevents storing arbitrary URLs (including private IPs) in the database.
export const assetUrlSchema = z.string().refine(
  (url) => {
    if (url.startsWith('/content/')) return true;
    if (!env.R2_PUBLIC_URL) return false;
    try {
      const allowed = new URL(env.R2_PUBLIC_URL);
      const given   = new URL(url);
      return given.origin === allowed.origin;
    } catch {
      return false;
    }
  },
  { message: 'URL must be a relative /content/ path or an R2 CDN URL' },
);
