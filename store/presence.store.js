// In-memory presence store
const presenceMap = new Map();
/*
userId => {
  status: "online" | "idle" | "away" | "offline" | "on_call",
  lastActive: Number,
  manual: Boolean
}
*/

module.exports = presenceMap;
