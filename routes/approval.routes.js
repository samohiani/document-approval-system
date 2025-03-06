const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");
const auth = require("../middleware/auth");

router.post("/flow", auth(2), approvalController.createApprovalFlow);

module.exports = router;
