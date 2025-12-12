const pushService = require("./push.service");

module.exports = {
  async saveSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscription = req.body.subscription;

      if (!subscription) {
        return res.status(400).json({ error: "Subscription data missing" });
      }

      await pushService.saveSubscription(userId, subscription);

      return res.json({ success: true });

    } catch (err) {
      console.error("saveSubscription error:", err);
      return res.status(500).json({ error: "Failed to save subscription" });
    }
  },

  async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.id;
      const subs = await pushService.getSubscriptionsForUser(userId);
      res.json({ success: true, data: subs });
    } catch (err) {
      console.error("getUserSubscriptions error:", err);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  },

  async deleteSubscription(req, res) {
    try {
      const userId = req.user.id;
      await pushService.deleteSubscription(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("deleteSubscription error:", err);
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  }
};
