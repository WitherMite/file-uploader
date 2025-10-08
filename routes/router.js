const { Router } = require("express");
const controller = require("../controllers/controller");
const router = Router();

router.get("/", controller.renderIndex);
router.get("/files", controller.renderFiles);
router.get("/signup", controller.renderSignupForm);
router.get("/login", controller.renderLoginForm);

router.post("/signup", controller.createUser);
router.post("/login", controller.loginUser);
router.post("/logout", controller.logoutUser);
router.post("/upload", controller.uploadFile);

module.exports = router;
