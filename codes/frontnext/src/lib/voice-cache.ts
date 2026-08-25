/**
 * The examiner's voice, kept in the browser so a replay is instant.
 *
 * The server caches synthesised speech too, but only in the memory of whichever
 * container answered. That service runs up to three instances and scales to
 * zero, so a student replaying a question they did not catch often lands on an
 * instance that never made it, and waits several seconds while it is made
 * again. The audio is not stored anywhere durable on our side at all.
 *
 * This closes the case that actually happens: one person replaying their own
 * question, on their own machine, possibly after a refresh or the next morning.
 * It does not help them across devices, and it is not meant to.
 *
 * Three rules.
 *
 * **Never breaks playback.** Private browsing, a denied quota, an old browser:
 * every failure here resolves to a miss, and a miss just means the audio is
 * fetched the way it always was.
 *
 * **Keyed by a real hash.** A cheap string hash would risk two different
 * questions sharing an entry, and the failure that produces is the examiner
 * speaking the wrong question, which is far worse than a slow one.
 *
 * **Bounded, oldest evicted first.** A defense is a few megabytes of speech and
 * a student may run several, so this cannot grow without limit.
 */

const DATABASE = 'citra-viva-voice';
const STORE = 'clips';
const VERSION = 1;

/** Roughly a dozen full defenses. Small beside a browser's usual allowance. */
const MAX_BYTES = 40 * 1024 * 1024;

interface Clip {
  key: string;
  mime: string;
  bytes: ArrayBuffer;
  size: number;
  used: number;
}

function available(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

/** SHA-256 of the line, so two different questions cannot collide onto one clip. */
async function keyFor(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'key' });
        // Eviction reads in this order, so the oldest clip is the first found.
        store.createIndex('used', 'used');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * The stored clip for this line, or null.
 *
 * Reading also marks it as used, so eviction removes what nobody has replayed
 * rather than whatever happens to be oldest by creation.
 */
export async function recallVoice(
  text: string,
): Promise<{ bytes: ArrayBuffer; mime: string } | null> {
  if (!available() || !text) return null;

  try {
    const key = await keyFor(text);
    const database = await open();

    const clip = await new Promise<Clip | undefined>((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result as Clip | undefined);
      request.onerror = () => reject(request.error);
    });

    if (!clip) {
      database.close();
      return null;
    }

    const touch = database.transaction(STORE, 'readwrite');
    touch.objectStore(STORE).put({ ...clip, used: Date.now() });
    await done(touch).catch(() => undefined);
    database.close();

    return { bytes: clip.bytes, mime: clip.mime };
  } catch {
    // A miss, which is the same thing as not having asked.
    return null;
  }
}

/** Keep this clip, evicting the least recently used until it fits. */
export async function rememberVoice(
  text: string,
  bytes: ArrayBuffer,
  mime: string,
): Promise<void> {
  if (!available() || !text || bytes.byteLength === 0) return;
  if (bytes.byteLength > MAX_BYTES) return;

  try {
    const key = await keyFor(text);
    const database = await open();

    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);

    store.put({ key, mime, bytes, size: bytes.byteLength, used: Date.now() } satisfies Clip);

    // Totalled from what is there rather than tracked in a counter, because a
    // counter and a store drift apart the first time a write fails.
    const clips = await new Promise<Clip[]>((resolve, reject) => {
      const request = store.index('used').getAll();
      request.onsuccess = () => resolve(request.result as Clip[]);
      request.onerror = () => reject(request.error);
    });

    let total = clips.reduce((sum, clip) => sum + clip.size, 0);
    for (const clip of clips) {
      if (total <= MAX_BYTES) break;
      if (clip.key === key) continue;
      store.delete(clip.key);
      total -= clip.size;
    }

    await done(transaction);
    database.close();
  } catch {
    // Quota refused, private browsing, or a database that will not open. The
    // voice still plays; it is simply made again next time.
  }
}
