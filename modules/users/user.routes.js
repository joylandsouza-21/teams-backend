const router = require("express").Router();
const UserController = require("./user.controller");
const { loginUserSchema, createUserSchema, updateUserSchema } = require("./user.schema");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload");

router.post("/register", validate(createUserSchema), UserController.createUser);

router.post("/login", validate(loginUserSchema), UserController.loginUser);

router.post("/update_profile", auth, upload.single("profile_pic"), UserController.updateUser);

router.get("/users", auth, UserController.getAllUsers);

module.exports = router;
