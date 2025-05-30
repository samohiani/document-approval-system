const Question = require("../models/question");

exports.addQuestion = async (req, res) => {
  const { form_id, question_text, question_type, options } = req.body;

  if (!question_text || !question_type) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  // Check for valid question type and options consistency:
  if (question_type === "multiple-choice") {
    if (!options || (Array.isArray(options) && options.length === 0)) {
      return res.status(400).json({
        status: "error",
        message: "Options are required for multiple-choice questions",
        data: [],
      });
    }
  } else if (question_type === "text") {
    req.body.options = null;
  }

  try {
    const newQuestion = await Question.create({
      form_id: form_id,
      question_text,
      question_type,
      options: req.body.options,
      created_by: req.user.id,
    });

    return res.status(201).json({
      status: "success",
      message: "Question added successfully",
      data: newQuestion,
    });
  } catch (error) {
    console.error("Error adding question:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while adding the question",
      data: [],
    });
  }
};

exports.getQuestionsForForm = async (req, res) => {
  const { form_id } = req.query; // Changed from req.params to req.query

  try {
    const questions = await Question.findAll({
      where: {
        form_id: form_id,
        deleted_flag: false,
      },
    });
    return res.status(200).json({
      status: "success",
      message: "Questions retrieved successfully",
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving questions",
      data: [],
    });
  }
};

exports.updateQuestion = async (req, res) => {
  const { form_id, question_id, question_text, question_type, options } =
    req.body;

  if (!question_text || !question_type) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const question = await Question.findOne({
      where: {
        id: question_id,
        form_id: form_id,
        deleted_flag: false,
      },
    });

    if (!question) {
      return res.status(404).json({
        status: "error",
        message: "Question not found",
        data: [],
      });
    }

    question.question_text = question_text;
    question.question_type = question_type;
    question.options = options;
    question.modified_by = req.user.id;
    await question.save();

    return res.status(200).json({
      status: "success",
      message: "Question updated successfully",
      data: question,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the question",
      data: [],
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  const { form_id, question_id } = req.body;

  try {
    const question = await Question.findOne({
      where: {
        id: question_id,
        form_id: form_id,
        deleted_flag: false,
      },
    });

    if (!question) {
      return res.status(404).json({
        status: "error",
        message: "Question not found",
        data: [],
      });
    }

    // Soft-delete by setting deleted_flag to true and recording who deleted it
    question.deleted_flag = true;
    question.deleted_by = req.user.id;
    await question.destroy();
    await question.save();

    return res.status(200).json({
      status: "success",
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the question",
      data: [],
    });
  }
};
