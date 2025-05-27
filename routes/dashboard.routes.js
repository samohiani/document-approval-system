const express = require("express");
const router = express.Router();
const {
  getAdminDashboardCounts,
  getStudentDashboardStats,
  getHODDashboardStats,
  getFacultyDashboardStats,
  getStaffDashboardStats,
  getSubDeanDashboardStats,
} = require("../controllers/dashboardController");
const auth = require("../middleware/auth");

router.get("/admin", auth(2), getAdminDashboardCounts);

router.get("/student", auth(1), getStudentDashboardStats);

router.get("/hod", auth(3), getHODDashboardStats);

router.get("/faculty", auth(4), getFacultyDashboardStats);

router.get("/staff", auth([3, 4, 5, 6, 7]), getStaffDashboardStats);

router.get("/sub-dean", auth([5, 6]), getSubDeanDashboardStats);

module.exports = router;
