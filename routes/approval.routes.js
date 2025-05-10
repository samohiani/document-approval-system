const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");
const auth = require("../middleware/auth");

router.post("/flow", auth(2), approvalController.createApprovalFlow);

router.get("/flow", auth(2), approvalController.getApprovalFlows);

module.exports = router;
