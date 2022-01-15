const express = require("express");
const router = express.Router();
const HomeController = require("../app/controllers/HomeController");
const AuthController = require("../app/controllers/AuthController");
const UserController = require("../app/controllers/UserController");
const MemberController = require("../app/controllers/MemberController");
const MessageController = require("../app/controllers/MessageController");
const GroupController = require("../app/controllers/GroupController");

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
router.post("/save_user", UserController.userSave);
router.get("/disconnect_user", UserController.userDisconnect);
router.post("/send_code", UserController.sendCode);
router.post("/singIn_user", UserController.singIn);
router.post("/singIn_user_with_code", UserController.singInWithCode);
router.post("/get_user", UserController.getUser);
router.delete("/delete_user/:id/:tel", UserController.deleteUser);

// messages Routes
router.get("/messages", MessageController.messagesPage);
router.post("/messages", MessageController.envoieMessage);
router.get("/scrap_messages", MessageController.scrapMessagePage);
router.post("/scrap_messages", MessageController.scrapMessages);
router.post("/get_message_group", MessageController.getGroup);

// members Routes
router.get("/members", MemberController.membersPage);
router.post("/members", MemberController.importScrapedMembers);
router.post("/getMembersByGroup", MemberController.getMembersByGroup);
router.get("/scrap_members", MemberController.scrapMembersPage);
router.post("/scrap_members", MemberController.scrapMembers);
router.get("/ajout_members", MemberController.ajoutMembersPage);
router.post("/ajout_members", MemberController.ajoutMembers);
router.post("/import_memebers_csv", MemberController.importMemebersFromCsv);
router.post("/get_members_csv", MemberController.getCsvData);

// group
router.get("/create_groupe", GroupController.getCreateGroupePage);
router.post("/create_groupe", GroupController.createGroupe);
router.post("/get_group", GroupController.getGroup);
router.post("/check_username", GroupController.checkUsername);

// router.get("*", (req, res) => {
//   res.send("page not found", 404);
// });

module.exports = router;
