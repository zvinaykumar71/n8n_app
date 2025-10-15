// repostService.js
import axios from 'axios';
import { loginToInstagram, fetchLatestPost, uploadMedia, generateThumbnail } from './instagramClient.js';
import { downloadMedia } from './utils/downloader.js';
import fs from 'fs';

const targets = JSON.parse(fs.readFileSync('./targets.json', 'utf-8'));
const postedMedia = new Set();

// export const  runRepostTask = async (req,res) => {
//   const ig = await loginToInstagram();

//   console.log(`🔐 Logged in as @${ig.state.cookieUserId}`);

//   for (const username of targets) {
//     try {
//       console.log(`🔍 Checking @${username}...`);

//       const post = await fetchLatestPost(ig, username);

//       console.log(`📥 Downloading from: ${post.mediaUrl}`);

//       if (!postedMedia.has(post.id)) {
//         const localPath = await downloadMedia(post.mediaUrl);
//         // await uploadMedia(ig, localPath, `📸: @${username}\n${post.caption}`);
//         // postedMedia.add(post.id);
//         // console.log(`✅ Reposted from @${username}`);
//         return res.json({localPath, caption: `📸: @${username}\n${post.caption}`});
//         // break; // repost only one per run
//       }
//     } catch (err) {
//       console.error(` Error from @${username}:`, err.message);
//     }
//   }
// };



// export const runRepostTask = async () => {
//   const ig = await loginToInstagram();
//   console.log(`🔐 Logged in as @${ig.state.cookieUserId}`);

//   for (const username of targets) {
//     try {
//       console.log(`🔍 Checking @${username}...`);

//       const post = await fetchLatestPost(ig, username);
//       console.log("post",post)
//       console.log(`📥 Downloading from: ${post.mediaUrl}`);

//       if (!postedMedia.has(post.id)) {
//         const localPath = await downloadMedia(post.mediaUrl);
//         console.log("localpath===>.", localPath)


//          // ✅ Send to n8n webhook

//       await axios.post('https://n8n.srv934690.hstgr.cloud/webhook/my_webhook', {
//         mediaUrl: post.mediaUrl,
//         caption: post.caption,
//         username: "username"
//       });




//         return {
//           localPath,
//           caption: `📸: @${username}\n${post.caption}`
//         }; // return data instead of using res
//       }
//     } catch (err) {
//       console.error(`❌ Error from @${username}:`, err.message);
//     }
//   }

//   return null; // nothing new to repost
// };



export const runRepostTask = async () => {
  console.log("repost task start here ==>");
  
  let ig;
  try {
    ig = await loginToInstagram();
    console.log(`🔐 Logged in as @${ig.state.cookieUserId}`);
  } catch (loginError) {
    console.error('❌ Login failed:', loginError.message);
    return null;
  }

  for (const username of targets) {
    try {
      console.log(`🔍 Checking @${username}...`);

      const post = await fetchLatestPost(ig, username);
      console.log("Post data:", {id: post.id, duration: post.video_duration});

      if (!postedMedia.has(post.id)) {
        // Download with retries
        let localPath;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            localPath = await downloadMedia(post.mediaUrl);
            break;
          } catch (dlError) {
            if (attempt === 3) throw dlError;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }

        console.log("Downloaded media path:", localPath);

        // Rest of your processing logic...
        // ... (keep your existing thumbnail and webhook code)
          // 2. Generate thumbnail from the downloaded file
        let thumbnailPath;
        try {
          thumbnailPath = await generateThumbnail(localPath);
          console.log("Generated thumbnail:", thumbnailPath);
        } catch (thumbnailError) {
          console.error("Thumbnail generation failed:", thumbnailError.message);
          thumbnailPath = null;
        }

        // 3. Detect post type
        const postType = detectPostType(post.mediaUrl);
        console.log("Post type:", postType);

        // 4. Prepare webhook data
        const webhookData = {
          mediaUrl: post.mediaUrl,
          caption: post.caption,
          username: username,
          postType: postType,
          ...(thumbnailPath && { cover_image: thumbnailPath }) // Only include if thumbnail exists
        };

        // 5. Send to n8n webhook
        try {
          const response = await axios.post(
            'https://n8n.srv934690.hstgr.cloud/webhook-test/my_webhook',
            webhookData,
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          console.log("Webhook response:", response.data);
        } catch (webhookError) {
          console.error("Webhook failed:", webhookError.message);
          if (webhookError.response) {
            console.error("Response data:", webhookError.response.data);
          }
        }


        return {
          localPath,
          caption: `📸: @${username}\n${post.caption}`
        };
      }
    } catch (err) {
      console.error(`❌ Error processing @${username}:`, err.message);
      if (err.response?.data) {
        console.error("Response data:", err.response.data);
      }
      
      // If session is definitely invalid, break the loop
      if (err.message.includes('login_required')) {
        break;
      }
    }
  }

  return null;
};

// 🔍 Detect post_type from file extension or content
function detectPostType(mediaUrl) {
  const url = mediaUrl.toLowerCase();

  if (url.endsWith('.mp4') || url.includes('video')) {
    return 'fb_reel';
  } else if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png')) {
    return 'fb_image';
  } else {
    return 'fb_unknown';
  }
}
