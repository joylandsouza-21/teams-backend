const MessageService = require("./message.service");

module.exports = {
  async getHistory(req, res) {
    try {
      const { conversationId } = req.params;
      const { limit = 50, before } = req.query;

      const messages = await MessageService.getHistory({
        conversationId,
        limit: Number(limit),
        before,
        userId: req.user.id
      });

      return res.json(messages);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
