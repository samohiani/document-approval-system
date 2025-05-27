const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");
const auth = require("../middleware/auth");

router.post("/flow", auth(2), approvalController.createApprovalFlow);

router.get("/flow", auth(2), approvalController.getApprovalFlows);

router.put("/flow", auth(2), approvalController.updateFormApprovalFlow);

router.get("/flow/:form_id", auth(2), approvalController.getApprovalFlowByFormId);

router.post(
  "/:approval_id/action",
  auth([3, 4, 5, 6, 7]),
  approvalController.handleApproval
);

router.get("/pending", auth(), approvalController.getPendingApprovals);

router.get(
  "/details/:approval_id",
  auth(),
  approvalController.getFormApprovalDetails
);

module.exports = router;
