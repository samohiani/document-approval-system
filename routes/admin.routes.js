const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware

// User CRUD
router.post("/users", auth(2), adminController.createUser);
router.get("/users", auth(2), adminController.getAllUsers);
router.get("/users/:id", auth(2), adminController.getUserById);
router.put("/users/:id", auth(2), adminController.updateUser);
router.delete("/users/:id", auth(2), adminController.deleteUser);

// College CRUD
router.post("/colleges", auth(2), adminController.createCollege);
router.get("/colleges", auth(2), adminController.getColleges);
router.get("/colleges/:id", auth(2), adminController.getCollegeById);
router.put("/colleges/:id", auth(2), adminController.updateCollege);
router.delete("/colleges/:id", auth(2), adminController.deleteCollege);

// Department CRUD
router.post("/departments", auth(2), adminController.createDepartment);
router.get("/departments", auth(2), adminController.getDepartments);
router.get("/departments/:id", auth(2), adminController.getDepartmentById);
router.put("/departments/:id", auth(2), adminController.updateDepartment);
router.delete("/departments/:id", auth(2), adminController.deleteDepartment);

// Role CRUD
router.post("/roles", auth(2), adminController.createRole);
router.get("/roles", auth(), adminController.getRoles);
router.get("/roles/:id", auth(2), adminController.getRoleById);
router.put("/roles/:id", auth(2), adminController.updateRole);
router.delete("/roles/:id", auth(2), adminController.deleteRole);

module.exports = router;
