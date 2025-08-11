import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// const { ACCESS_TOKEN, IG_USER_ID } = process.env;




// STEP 1: Create container
export const createContainer = async (req, res) => {

  const { image_url, caption } = req.body;
  const IG_USER_ID = process.env.IG_USER_ID;
  const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
  const API_VERSION = process.env.API_VERSION;
  const HOST_URL = process.env.HOST_URL;

  try {
    const response = await axios.post(
      `${HOST_URL}/${API_VERSION}/${IG_USER_ID}/media`,
      {
        image_url,
        caption,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    res.json({ success: true, creation_id: response.data.id });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }};

// export const createContainer = async (req, res) => {
//   const { image_url, video_url, caption } = req.body;
//   const IG_USER_ID = process.env.IG_USER_ID;
//   const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
//   const API_VERSION = process.env.API_VERSION;
//   const HOST_URL = process.env.HOST_URL;
//   console.log('Creating media with image_url:', image_url);
//   console.log('Creating media with video_url:', video_url);
//   console.log('Using caption:', caption);
//   console.log('Using IG_USER_ID:', IG_USER_ID);
//   console.log('Using ACCESS_TOKEN:', ACCESS_TOKEN);
//   console.log('Using API_VERSION:', API_VERSION);
//   console.log('Using HOST_URL:', HOST_URL);

//   try {
//     if (!image_url && !video_url) {
//       return res.status(400).json({ success: false, error: 'Provide either image_url or video_url' });
//     }

//     let endpoint = `${HOST_URL}/${API_VERSION}/${IG_USER_ID}/media`;
//     const params = {
//       caption,
//       access_token: ACCESS_TOKEN,
//     };

//     if (video_url) {
//       params.media_type = 'VIDEO';
//       params.video_url = video_url;
//     } else {
//       params.image_url = image_url;
//     }

//     const response = await axios.post(endpoint, null, { params });

//     res.json({ success: true, creation_id: response.data.id });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.response?.data || error.message,
//     });
//   }
// };



// STEP 2: Publish container
// export const publishContainer = async (req, res) => {
//   if (!req.body || !req.body.container_id) {
//     return res.status(400).json({ error: 'Container ID is required' });
//   }
//   const { container_id } = req.body;

//   try {
//     const publishRes = await axios.post(
//       `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`,
//       null,
//       {
//         params: {
//           creation_id: container_id,
//           access_token: ACCESS_TOKEN,
//         },
//       }
//     );

//     res.json({ post_id: publishRes.data.id });
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to publish media' });
//   }
// }


export const publishContainer = async (req, res) => {
  const { creation_id } = req.body;
  const IG_USER_ID = process.env.IG_USER_ID;
  const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
  const API_VERSION = process.env.API_VERSION;
  const HOST_URL = process.env.HOST_URL;

  console.log('Publishing media with creation_id:', creation_id);
  console.log('Using IG_USER_ID:', IG_USER_ID);
  console.log('Using ACCESS_TOKEN:', ACCESS_TOKEN);
  console.log('Using API_VERSION:', API_VERSION);
  console.log('Using HOST_URL:', HOST_URL);


  if (!creation_id) {
    return res.status(400).json({ success: false, error: 'creation_id is required' });
  }

  try {
    const response = await axios.post(
      `${HOST_URL}/${API_VERSION}/${IG_USER_ID}/media_publish`,
      {
        creation_id,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    res.json({ success: true, post_id: response.data.id });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};


