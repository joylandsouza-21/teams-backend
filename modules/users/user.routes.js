const router = require("express").Router();
const UserController = require("./user.controller");
const { loginUserSchema, createUserSchema } = require("./user.schema");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth.middleware");

router.post("/register", validate(createUserSchema), UserController.createUser);
router.post("/login", validate(loginUserSchema), UserController.loginUser);

router.get("/users", auth, UserController.getAllUsers);

module.exports = router;
