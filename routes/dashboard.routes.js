const express = require("express");
const router = express.Router();
const {
  getAdminDashboardCounts,
} = require("../controllers/dashboardController");

router.get("/admin", getAdminDashboardCounts);

module.exports = router;
