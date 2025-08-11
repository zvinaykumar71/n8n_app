// utils/downloader.js
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const downloadMedia = async (url) => {
  const extension = url.includes('.mp4') ? '.mp4' : '.jpg';
  const filename = `${uuidv4()}${extension}`;
  const filePath = path.resolve('media', filename);

  try {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // ✅ Validate file exists and is > 1KB
    const stats = await fs.stat(filePath);
    if (stats.size < 1024) {
      await fs.remove(filePath);
      throw new Error(`Downloaded file too small (${stats.size} bytes), likely corrupt`);
    }

    return filePath;
  } catch (err) {
    console.error(`❌ Download error: ${err.message}`);
    throw new Error(`Failed to download media: ${err.message}`);
  }
};
