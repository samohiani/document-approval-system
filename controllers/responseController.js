const FormResponse = require("../models/formResponse");
const ResponseDetail = require("../models/responseDetail");
const Form = require("../models/form");
const Question = require("../models/question");

// Submit a form response along with answers for each question
exports.submitResponse = async (req, res) => {
  const { form_id } = req.params;
  const { answers } = req.body; // Expect an array of { question_id, answer_text }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Answers are required",
      data: [],
    });
  }

  try {
    // Create a new form response for the student
    const formResponse = await FormResponse.create({
      form_id: form_id,
      user_id: req.user.id,
      status: "pending",
    });

    // Create a response detail for each answer provided
    const responseDetails = await Promise.all(
      answers.map(async (ans) => {
        return await ResponseDetail.create({
          response_id: formResponse.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text,
        });
      })
    );

    return res.status(201).json({
      status: "success",
      message: "Form submitted successfully",
      data: {
        formResponse,
        responseDetails,
      },
    });
  } catch (error) {
    console.error("Error submitting response:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while submitting the form",
      data: [],
    });
  }
};

exports.getUserFormSubmissions = async (req, res) => {
  try {
    const user_id = req.user.id;

    const submissions = await FormResponse.findAll({
      where: { user_id: user_id },
      include: [
        {
          model: Form,
          as: "form",
          attributes: ["id", "title", "description"],
        },
      ],
    });

    const formatted = submissions.map((submission) => ({
      form_id: submission.form.id,
      form_title: submission.form.title,
      form_description: submission.form.description,
      status: submission.status,
      submitted_on: submission.created_on,
    }));

    res.status(200).json({
      status: "success",
      message: "Submitted Forms Retrieved successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the forms",
      data: [],
    });
  }
};

// Retrieve all responses for a form
exports.getResponsesForForm = async (req, res) => {
  const { id } = req.body;

  try {
    const responses = await FormResponse.findAll({
      where: { form_id: id },
      include: [
        {
          model: ResponseDetail,
          as: "details",
        },
      ],
    });

    return res.status(200).json({
      status: "success",
      message: "Responses retrieved successfully",
      data: responses,
    });
  } catch (error) {
    console.error("Error retrieving responses:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving responses",
      data: [],
    });
  }
};
