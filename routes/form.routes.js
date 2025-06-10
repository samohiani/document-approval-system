const express = require("express");
const router = express.Router();
const formController = require("../controllers/formController");
const auth = require("../middleware/auth");

router.post("/", auth(2), formController.createForm);

router.get("/", auth([2, 1]), formController.getForms);

router.get("/initiatable", auth(), formController.getInitiatableForms);

router.get("/:id", auth(), formController.getFormById);

router.put("/edit", auth(2), formController.updateForm);

router.put("/delete", auth(2), formController.deleteForm);

router.post("/:form_id/submit", auth([1, 4, 8]), formController.submitResponse);

router.get("/:response_id/progress", auth(), formController.getFormProgress);

module.exports = router;
