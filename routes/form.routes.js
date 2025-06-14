const express = require("express");
const router = express.Router();
const formController = require("../controllers/formController");
const auth = require("../middleware/auth");

router.post("/", auth(2), formController.createForm);

router.get("/", auth(), formController.getForms);

router.get("/:id", auth(), formController.getFormById);

router.put("/edit", auth(2), formController.updateForm);

router.put("/delete", auth(2), formController.deleteForm);

router.post("/:form_id/submit", auth(), formController.submitResponse);

router.get("/:response_id/progress", auth(), formController.getFormProgress);

module.exports = router;
