const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const auth = require("../middleware/auth");

router.post("/", auth(2), questionController.addQuestion);

router.get("/", auth(), questionController.getQuestionsForForm);

router.put("/update", auth(2), questionController.updateQuestion);

router.put("/delete", auth(2), questionController.deleteQuestion);

module.exports = router;
