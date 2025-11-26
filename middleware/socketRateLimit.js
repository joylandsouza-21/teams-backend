module.exports = function socketRateLimit(limit = 20, windowMs = 5000) {
  const userEvents = new Map();

  return (socket, next) => {
    const userId = socket.user?.id || socket.id;
    const now = Date.now();

    if (!userEvents.has(userId)) {
      userEvents.set(userId, []);
    }

    const events = userEvents.get(userId);

    // Remove old events
    while (events.length && events[0] <= now - windowMs) {
      events.shift();
    }

    // Rate limit exceeded
    if (events.length >= limit) {
      return next(new Error("RATE_LIMIT_EXCEEDED"));
    }

    events.push(now);
    next();
  };
};
