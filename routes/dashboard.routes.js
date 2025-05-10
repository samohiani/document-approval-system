const express = require("express");
const router = express.Router();
const {
  getAdminDashboardCounts,
  getStudentDashboardStats,
  getHODDashboardStats,
} = require("../controllers/dashboardController");
const auth = require("../middleware/auth");

router.get("/admin", auth(2), getAdminDashboardCounts);

router.get("/student", auth(1), getStudentDashboardStats);

router.get("/hod", auth(3), getHODDashboardStats);
module.exports = router;
