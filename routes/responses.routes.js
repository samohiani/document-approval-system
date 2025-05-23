const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const auth = require("../middleware/auth");

router.get("/", auth(), responseController.getResponsesForForm);

router.get("/user", auth(), responseController.getUserFormSubmissions);

module.exports = router;
