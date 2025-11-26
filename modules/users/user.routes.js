const router = require("express").Router();
const UserController = require("./user.controller");
const { loginUserSchema, createUserSchema } = require("./user.schema");
const validate = require("../../middleware/validate");

router.post("/register", validate(createUserSchema), UserController.createUser);
router.get("/login", validate(loginUserSchema), UserController.loginUser);

module.exports = router;
