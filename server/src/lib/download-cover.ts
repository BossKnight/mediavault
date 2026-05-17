// Shared helper used by both the item route (when adding a new item) and the
// migration script (when backfilling covers for existing items).
//
// Keeping shared logic in a "lib" folder is a common pattern — it avoids
// copying the same code into multiple places. If the download logic ever needs
// to change (e.g. adding retries), you change it once here.

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Downloads a cover image from an external URL and saves it to the local
// images directory. Returns the relative path ("images/xxx-cover.jpg") on
// success, or null if the download fails for any reason.
export async function downloadCover(url: string, itemId: string): Promise<string | null> {
  try {
    const imagesDir = path.resolve(process.env.IMAGES_DIR ?? './data/images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const filename = `${itemId}-cover.jpg`;
    const filepath = path.join(imagesDir, filename);

    // responseType: 'stream' means axios pipes the image bytes directly to disk
    // instead of loading the whole file into memory first.
    const response = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
      timeout: 8000,
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return `images/${filename}`;
  } catch {
    return null;
  }
}
