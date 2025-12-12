const PushSubscription = require("./pushSubscription.model.pg");

module.exports = {
  async saveSubscription(userId, subscription) {
    return PushSubscription.upsert({
      user_id: userId,
      subscription_json: subscription,
    });
  },

  async getSubscriptionsForUser(userId) {
    return PushSubscription.findAll({
      where: { user_id: userId },
    });
  },

  async deleteSubscription(userId) {
    return PushSubscription.destroy({
      where: { user_id: userId },
    });
  }
};
