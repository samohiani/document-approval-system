const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const auth = require("../middleware/auth");

router.post("/:form_id", auth(1), responseController.submitResponse);

router.get("/", auth(), responseController.getResponsesForForm);

router.get("/user", auth(1), responseController.getUserFormSubmissions);

module.exports = router;
