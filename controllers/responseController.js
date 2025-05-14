const FormResponse = require("../models/formResponse");
const ResponseDetail = require("../models/ResponseDetail");
const Form = require("../models/form");

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
