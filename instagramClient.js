// instagramClient.js
import { IgApiClient } from 'instagram-private-api';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static'; // ✅

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path); // ✅





ffmpeg.setFfmpegPath(ffmpegPath);

export const loginToInstagram = async () => {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
  return ig;
};

export const fetchLatestPost = async (ig, username) => {
  const userId = await ig.user.getIdByUsername(username);
  const feed = ig.feed.user(userId);
  const items = await feed.items();

  const reel = items.find(item =>
    item.media_type === 2 &&
    item.video_duration < 90 &&
    item.original_width < item.original_height
  );

  if (!reel) throw new Error(`No vertical short video (Reel-like) found for @${username}`);

  return {
    id: reel.id,
    isVideo: true,
    mediaUrl: reel.video_versions?.[0]?.url,
    caption: reel.caption?.text || ''
  };
};
// ---------------
const generateThumbnail = (videoPath) => {
  return new Promise((resolve, reject) => {
    const output = videoPath.replace('.mp4', '.jpg');
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        folder: 'media',
        filename: output.split('/').pop(),
        size: '640x?'
      })
      .on('end', () => resolve(output))
      .on('error', reject);
  });
};

export const uploadMedia = async (ig, filePath, caption) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Media file does not exist');
    }

    const buffer = fs.readFileSync(filePath);
    console.log('🎞 Video size:', buffer?.byteLength, 'bytes');

    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Downloaded video file is empty or corrupt');
    }

    if (filePath.endsWith('.mp4')) {
      const coverPath = await generateThumbnail(filePath);

      if (!fs.existsSync(coverPath)) {
        throw new Error('❌ Thumbnail (cover) not generated!');
      }

      const cover = fs.readFileSync(coverPath);
      console.log('🖼 Cover size:', cover?.byteLength, 'bytes');

      if (!cover || cover.byteLength === 0) {
        throw new Error('❌ Cover image is empty or corrupt');
      }

      console.log('🧪 Uploading Reel...');
console.log('🧪 Buffer valid:', Buffer.isBuffer(buffer), 'Length:', buffer?.byteLength);
console.log('🧪 Cover valid:', Buffer.isBuffer(cover), 'Length:', cover?.byteLength);
console.log('🧪 Caption:', caption);

      await ig.publish.video({
        video: Buffer.from(buffer),
        cover: Buffer.from(cover),
        caption: caption || '',
      });

      fs.unlinkSync(coverPath); // optional cleanup
    } else {
      await ig.publish.photo({
        file: Buffer.from(buffer),
        caption: caption || '',
      });
    }

    console.log('✅ Uploaded successfully');
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`);
  }
};



// export const uploadMedia = async (ig, filePath, caption) => {
//   try {
//     if (!filePath || !fs.existsSync(filePath)) {
//       throw new Error('Media file does not exist');
//     }

//     const buffer = fs.readFileSync(filePath);

//     if (!buffer || buffer.byteLength === 0) {
//       throw new Error('Downloaded video file is empty or corrupt');
//     }

//     if (filePath.endsWith('.mp4')) {
//       await ig.publish.video({
//         video: buffer,
//         cover: buffer, // dummy cover required to avoid byteLength error
//         caption,
//       });
//     } else {
//       await ig.publish.photo({
//         file: buffer,
//         caption,
//       });
//     }

//     console.log('✅ Uploaded successfully');
//   } catch (err) {
//     throw new Error(`Upload failed: ${err.message}`);
//   }
// };
