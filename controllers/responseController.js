const FormResponse = require("../models/formResponse");
const ResponseDetail = require("../models/ResponseDetail");
const Form = require("../models/form");
const Approval = require("../models/approval"); // Added Approval model

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

exports.getSubmissionById = async (req, res) => {
  try {
    const { submission_id } = req.params;

    const submission = await FormResponse.findByPk(submission_id, {
      include: [
        {
          model: Form,
          as: "form",
          attributes: ["id", "title", "description"],
        },
        {
          model: ResponseDetail,
          as: "details",
          attributes: ["question_id", "answer_text", "option_id"],
        },
        {
          model: Approval, // Include Approval model
          as: "approvals", // Make sure this alias matches your model definition
          attributes: [
            "approver_id",
            "status",
            "comment",
            "step_number",
            "created_on",
            "updated_on",
          ],
          // Optionally, include approver details if needed, e.g., User model
          // include: [{ model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }]
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        status: "error",
        message: "Submission not found",
        data: null,
      });
    }

    const formattedSubmission = {
      id: submission.id,
      form_id: submission.form_id,
      user_id: submission.user_id,
      status: submission.status,
      created_on: submission.created_on,
      updated_on: submission.updated_on,
      form: {
        id: submission.form.id,
        title: submission.form.title,
        description: submission.form.description,
      },
      details: submission.details.map((detail) => ({
        question_id: detail.question_id,
        answer_text: detail.answer_text,
        option_id: detail.option_id,
      })),
      approvals: submission.approvals
        ? submission.approvals.map((approval) => ({
            approver_id: approval.approver_id,
            status: approval.status,
            comment: approval.comment,
            step_number: approval.step_number,
            created_on: approval.created_on,
            updated_on: approval.updated_on,
          }))
        : [], 
    };

    res.status(200).json({
      status: "success",
      message: "Submission retrieved successfully",
      data: formattedSubmission,
    });
  } catch (error) {
    console.error("Error fetching submission by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the submission",
      data: null,
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
