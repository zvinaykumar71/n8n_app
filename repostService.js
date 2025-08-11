// repostService.js
import { loginToInstagram, fetchLatestPost, uploadMedia } from './instagramClient.js';
import { downloadMedia } from './utils/downloader.js';
import fs from 'fs';

const targets = JSON.parse(fs.readFileSync('./targets.json', 'utf-8'));
const postedMedia = new Set();

export const  runRepostTask = async () => {
  const ig = await loginToInstagram();

  console.log(`🔐 Logged in as @${ig.state.cookieUserId}`);

  for (const username of targets) {
    try {
      console.log(`🔍 Checking @${username}...`);

      const post = await fetchLatestPost(ig, username);

      console.log(`📥 Downloading from: ${post.mediaUrl}`);

      if (!postedMedia.has(post.id)) {
        const localPath = await downloadMedia(post.mediaUrl);
        // await uploadMedia(ig, localPath, `📸: @${username}\n${post.caption}`);
        // postedMedia.add(post.id);
        // console.log(`✅ Reposted from @${username}`);
        return res.json({localPath, caption: `📸: @${username}\n${post.caption}`});
        // break; // repost only one per run
      }
    } catch (err) {
      console.error(` Error from @${username}:`, err.message);
    }
  }
};
