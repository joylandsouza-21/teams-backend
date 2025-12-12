// config/livekit.js
const { AccessToken } = require("livekit-server-sdk");

const LIVEKIT_API_KEY = process.env.LK_API_KEY;
const LIVEKIT_SECRET = process.env.LK_API_SECRET;
const LIVEKIT_URL = process.env.LK_URL;

function createLivekitToken({ identity, roomName }) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
    identity: String(identity), // userId
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return at.toJwt();
}

module.exports = {
  createLivekitToken,
  LIVEKIT_URL,
};
