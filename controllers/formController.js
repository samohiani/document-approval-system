const Form = require("../models/form");
const FormResponse = require("../models/formResponse");
const Question = require("../models/question");
const User = require("../models/user");
const Role = require("../models/role");
const ApprovalFlow = require("../models/approvalFlow");
const ResponseDetail = require("../models/ResponseDetail");
const Approval = require("../models/approval");

exports.createForm = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.create({
      title,
      description,
      created_by: req.user.id,
    });

    return res.status(201).json({
      status: "success",
      message: "Form created successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error creating form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the form",
      data: [],
    });
  }
};

exports.getForms = async (req, res) => {
  try {
    const forms = await Form.findAll({
      where: { deleted_flag: false },
    });
    return res.status(200).json({
      status: "success",
      message: "Forms retrieved successfully",
      data: forms,
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving forms",
      data: [],
    });
  }
};

// Retrieve details of a single form (including its non-deleted questions)
exports.getFormById = async (req, res) => {
  const { id } = req.params;

  try {
    const form = await Form.findOne({
      where: { id, deleted_flag: false },
      include: [
        {
          model: Question,
          as: "questions",
          where: { deleted_flag: false },
          required: false,
        },
      ],
    });

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Form retrieved successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error fetching form", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the form",
      data: [],
    });
  }
};

// Update an existing form (Admin only)
exports.updateForm = async (req, res) => {
  const { id, title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.findOne({ where: { id, deleted_flag: false } });
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    form.title = title;
    form.description = description;
    form.modified_by = req.user.id;
    await form.save();

    return res.status(200).json({
      status: "success",
      message: "Form updated successfully",
      data: form,
    });
  } catch (error) {
    console.error("Error updating form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the form",
      data: [],
    });
  }
};

exports.deleteForm = async (req, res) => {
  const { form_id } = req.body;

  if (!form_id) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const form = await Form.findOne({
      where: { id: form_id, deleted_flag: false },
    });
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    form.deleted_flag = true;
    form.deleted_by = req.user.id;
    await form.destroy();
    await form.save();

    return res.status(200).json({
      status: "success",
      message: "Form deleted successfully",
      data: [],
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the form",
      data: [],
    });
  }
};

exports.submitResponse = async (req, res) => {
  const { form_id } = req.params;
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res
      .status(400)
      .json({ status: "error", message: "Answers are required" });
  }

  try {
    const user = req.user;

    // Create form response
    const formResponse = await FormResponse.create({
      form_id,
      user_id: user.id,
      status: "pending",
    });

    // Save answers
    await Promise.all(
      answers.map((ans) =>
        ResponseDetail.create({
          response_id: formResponse.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text,
        })
      )
    );

    // Get approval flow
    const approvalFlow = await ApprovalFlow.findOne({ where: { form_id } });
    if (!approvalFlow) throw new Error("Approval flow not found for form.");

    let flowDefinition = approvalFlow.flow_definition;
    if (typeof flowDefinition === "string") {
      flowDefinition = JSON.parse(flowDefinition);
    }

    const step2 = flowDefinition[1]; // step 2 approver
    const roleRequired = step2.role_required.toLowerCase();

    // Find user for step 2
    let approver;
    if (roleRequired.includes("departmental")) {
      approver = await User.findOne({
        where: {
          role_id: 7,
          department_id: user.department_id,
        },
      });
    } else if (roleRequired.includes("college")) {
      approver = await User.findOne({
        where: {
          role_id: 7,
          college_id: user.college_id,
        },
      });
    } else if (roleRequired === "hod") {
      approver = await User.findOne({
        where: {
          role_id: 3,
          department_id: user.department_id,
        },
      });
    } else {
      // global roles like dean SPS
      const role = await Role.findOne({
        where: { name: step2.role_required },
      });
      approver = await User.findOne({
        where: { role_id: role.id },
      });
    }

    if (!approver)
      throw new Error(`Approver for role ${roleRequired} not found.`);

    // Create first approval entry
    await Approval.create({
      response_id: formResponse.id,
      step_number: 2,
      role_required: step2.role_required,
      approver_id: approver.id,
    });

    return res.status(201).json({
      status: "success",
      message: "Form submitted and routed for approval.",
    });
  } catch (error) {
    console.error("Submit response error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Submission failed",
    });
  }
};
