const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const auth = require("../middleware/auth");

router.post("/:form_id", auth(1), responseController.submitResponse);

// Get all responses for a specific form (could be restricted to admin or teacher roles)
router.get("/:id", auth(), responseController.getResponsesForForm);

module.exports = router;
