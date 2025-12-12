const router = require("express").Router();
const auth = require("../../middleware/auth.middleware");
const pushController = require("./push.controller");

router.post("/save-subscription", auth, pushController.saveSubscription);
router.get("/subscriptions", auth, pushController.getUserSubscriptions);
router.delete("/subscription", auth, pushController.deleteSubscription);

module.exports = router;
