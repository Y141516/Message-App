/**
 * Runs background work (Telegram notifications, broadcast fan-out, etc.)
 * AFTER the HTTP response has already been sent, without it getting
 * silently killed mid-flight.
 *
 * The problem this fixes: a bare `void someAsyncWork()` ("fire and forget")
 * inside a Next.js Route Handler is NOT safe on Vercel. Once the response
 * is returned, Vercel can freeze/tear down the serverless function's
 * execution environment at any point — including mid-loop — because the
 * platform considers the request lifecycle finished. For something like
 * notifying 2,000 users in batches (which can take over a minute), this
 * meant most of the batches were silently never sent in production.
 *
 * `waitUntil` from `@vercel/functions` explicitly tells the platform "keep
 * this function alive until this promise settles," which is the documented,
 * supported way to do background work after responding. Outside Vercel
 * (local dev, self-hosted Node), it degrades gracefully to just letting the
 * promise run normally.
 */
import { waitUntil as vercelWaitUntil } from '@vercel/functions';

export function runInBackground(work: () => Promise<void>) {
  const promise = work().catch((err) => {
    console.error('Background task failed:', err);
  });

  try {
    vercelWaitUntil(promise);
  } catch {
    // Not running in a context waitUntil understands (e.g. local dev) —
    // the promise above is already running, nothing more to do.
  }
}
