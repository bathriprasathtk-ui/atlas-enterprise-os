import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Lazily-created Supabase browser client.
 *
 * The real client is NOT created at module scope: `next build`
 * evaluates this module while prerendering pages, and the
 * environment is not guaranteed to exist there. The first
 * property access creates (and thereafter reuses) the client,
 * so importing this module is always side-effect free.
 */
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client === null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Set " +
          "NEXT_PUBLIC_SUPABASE_URL and " +
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );
    }

    client = createBrowserClient(url, key);
  }

  return client;
}

/**
 * Drop-in `supabase` object: every property access is routed
 * to the underlying client, created on first use.
 */
export const supabase: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, property) {
      const real = getClient();
      const value = Reflect.get(real, property, real);

      return typeof value === "function"
        ? value.bind(real)
        : value;
    },
    has(_target, property) {
      return Reflect.has(getClient(), property);
    },
    set() {
      throw new Error(
        "The shared Supabase client is read-only."
      );
    },
  }
);
