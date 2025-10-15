import { IgApiClient } from 'instagram-private-api';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

// Configure FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const SESSION_FILE = path.join(process.cwd(), 'instagram-session.json');

export const loginToInstagram = async () => {
  if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
    throw new Error('Instagram credentials not found in environment variables');
  }

  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);

  try {
    // Try to load existing session
    const session = await loadSession();
    if (session) {
      await ig.state.deserialize(session);
      try {
        // Verify the session is still valid
        await ig.account.currentUser();
        console.log('Reused existing session');
        return ig;
      } catch (e) {
        console.log('Session expired, logging in again');
      }
    }

    // If no session or session expired, login fresh
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    
    // Save the new session
    const serialized = await ig.state.serialize();
    await saveSession(serialized);
    
    console.log('Created new session');
    return ig;
  } catch (error) {
    throw new Error(`Instagram login failed: ${error.message}`);
  }
};

async function loadSession() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    console.error('Error loading session:', error);
    return null;
  }
}

async function saveSession(session) {
  try {
    await fs.writeFile(SESSION_FILE, JSON.stringify(session), 'utf8');
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

// File to store downloaded media URLs
const DOWNLOADED_URLS_FILE = path.join(process.cwd(), 'downloaded_media_urls.txt');

export const fetchLatestPost = async (ig, username, limit = 10) => {
  if (!ig || !username) {
    throw new Error('Instagram client and username are required');
  }

  try {
    const userId = await ig.user.getIdByUsername(username);
    const feed = ig.feed.user(userId);
    const items = await feed.items();
    
    // Process up to the specified limit of posts
    const posts = items.slice(0, limit).map(item => {
      let mediaUrl = '';
      let isVideo = false;
      let type = 'image';

      if (item.media_type === 1) { // Image
        mediaUrl = item.image_versions2?.candidates?.[0]?.url || '';
      } else if (item.media_type === 2) { // Video
        mediaUrl = item.video_versions?.[0]?.url || '';
        isVideo = true;
        type = item.video_duration < 90 ? 'reel' : 'video';
      } else if (item.media_type === 8) { // Carousel
        // Get first item from carousel
        const carouselItem = item.carousel_media?.[0];
        if (carouselItem) {
          if (carouselItem.media_type === 1) {
            mediaUrl = carouselItem.image_versions2?.candidates?.[0]?.url || '';
          } else if (carouselItem.media_type === 2) {
            mediaUrl = carouselItem.video_versions?.[0]?.url || '';
            isVideo = true;
            type = carouselItem.video_duration < 90 ? 'reel' : 'video';
          }
        }
      }

      return {
        id: item.id,
        type,
        isVideo,
        mediaUrl,
        caption: item.caption?.text || '',
        timestamp: item.taken_at,
        width: item.original_width,
        height: item.original_height,
        ...(isVideo && { duration: item.video_duration })
      };
    }).filter(post => post.mediaUrl); // Filter out posts without media URLs

    // Save URLs to file
    await saveMediaUrls(posts);

    return posts;
  } catch (error) {
    console.error(`Error fetching posts for @${username}:`, error.message);
    if (error.message.includes('login_required')) {
      await fs.unlink(SESSION_FILE);
      throw new Error('Session expired - please login again');
    }
    throw error;
  }
};

async function saveMediaUrls(posts) {
  const urls = posts.map(post => `${post.type.toUpperCase()}: ${post.mediaUrl}`);
  await fs.writeFile(DOWNLOADED_URLS_FILE, urls.join('\n'), 'utf8');
  console.log(`Saved ${urls.length} media URLs to ${DOWNLOADED_URLS_FILE}`);
}

export const downloadAllMedia = async (ig, username) => {
  const posts = await fetchAllPosts(ig, username);
  const downloadDir = path.join(process.cwd(), 'downloads', username);
  
  try {
    await fs.mkdir(downloadDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const results = [];
  
  for (const post of posts) {
    try {
      const fileExt = post.isVideo ? 'mp4' : 'jpg';
      const fileName = `${post.id}.${fileExt}`;
      const filePath = path.join(downloadDir, fileName);

      const response = await axios({
        method: 'get',
        url: post.mediaUrl,
        responseType: 'stream',
        headers: {
          'Referer': 'https://www.instagram.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`Downloaded ${post.type}: ${filePath}`);
      results.push({
        ...post,
        localPath: filePath
      });
    } catch (error) {
      console.error(`Failed to download ${post.type} ${post.id}:`, error.message);
      results.push({
        ...post,
        error: error.message
      });
    }
  }

  return results;
};

export const generateThumbnail = (videoPath) => {
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
      .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)));
  });
};




// // instagramClient.js
// import { IgApiClient } from 'instagram-private-api';
// import fs from 'fs';
// import dotenv from 'dotenv';
// dotenv.config();
// import ffmpeg from 'fluent-ffmpeg';
// import ffmpegPath from 'ffmpeg-static';
// import ffprobePath from 'ffprobe-static'; // ✅

// ffmpeg.setFfmpegPath(ffmpegPath);
// ffmpeg.setFfprobePath(ffprobePath.path); // ✅





// ffmpeg.setFfmpegPath(ffmpegPath);

// export const loginToInstagram = async () => {
//   const ig = new IgApiClient();
//   ig.state.generateDevice(process.env.IG_USERNAME);
//   await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
//   return ig;
// };

// export const fetchLatestPost = async (ig, username) => {
//   const userId = await ig.user.getIdByUsername(username);
//   const feed = ig.feed.user(userId);
//   const items = await feed.items();

//   const reel = items.find(item =>
//     item.media_type === 2 &&
//     item.video_duration < 90 &&
//     item.original_width < item.original_height
//   );

//   if (!reel) throw new Error(`No vertical short video (Reel-like) found for @${username}`);

//   return {
//     id: reel.id,
//     isVideo: true,
//     mediaUrl: reel.video_versions?.[0]?.url,
//     caption: reel.caption?.text || ''
//   };
// };
// // ---------------
// const generateThumbnail = (videoPath) => {
//   return new Promise((resolve, reject) => {
//     const output = videoPath.replace('.mp4', '.jpg');
//     ffmpeg(videoPath)
//       .screenshots({
//         count: 1,
//         folder: 'media',
//         filename: output.split('/').pop(),
//         size: '640x?'
//       })
//       .on('end', () => resolve(output))
//       .on('error', reject);
//   });
// };







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
