const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const auth = require("../middleware/auth");

router.get("/", auth(), responseController.getResponsesForForm);

router.get("/user", auth(), responseController.getUserFormSubmissions);

router.get("/:submission_id", auth(), responseController.getSubmissionById);

module.exports = router;
