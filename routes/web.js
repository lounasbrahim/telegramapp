const express = require("express");
const router = express.Router();
const HomeController = require("../app/controllers/HomeController");
const AuthController = require("../app/controllers/AuthController");
const UserController = require("../app/controllers/UserController");
const MemberController = require("../app/controllers/MemberController");
const MessageController = require("../app/controllers/MessageController");

// Auth Routes
router.get("/", HomeController.homePage);
router.get("/login", AuthController.loginPage);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/sign-up", AuthController.signUpPage);
router.post("/sign-up", AuthController.signUp);
router.get("/forgot-password", AuthController.forgotPasswordPage);
router.post("/forgot-password", AuthController.forgotPassword);

// User Routes
router.get("/user", UserController.userPage);
router.post("/user", UserController.user);

// messages Routes
router.get("/messages", MessageController.messagesPage);
router.post("/messages", MessageController.envoieMessage);
router.get("/scrap_messages", MessageController.scrapMessagePage);
router.post("/scrap_messages", MessageController.scrapMessages);

// members Routes
router.get("/members", MemberController.membersPage);

router.get("*", (req, res) => {
  res.send("page not found", 404);
});

module.exports = router;
