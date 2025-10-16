const { Router } = require("express");
const controller = require("../controllers/controller");
const router = Router();

router.get("/", controller.renderIndex);
router.get("/home", controller.renderHomepage);
router.get("/signup", controller.renderSignupForm);
router.get("/login", controller.renderLoginForm);
router.get("/folder/:folderId", controller.renderFolder);

router.post("/signup", controller.createUser);
router.post("/login", controller.loginUser);
router.post("/logout", controller.logoutUser);
router.post("/upload", controller.uploadFile);
router.post("/new-folder", controller.createFolder);
router.post("/folder", controller.updateFolder);

module.exports = router;
