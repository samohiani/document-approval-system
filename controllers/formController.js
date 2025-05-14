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

exports.getFormProgress = async (req, res) => {
  try {
    const { response_id } = req.params;
    const user_id = req.user.id;

    // Fetch the form response
    const formResponse = await FormResponse.findOne({
      where: { id: response_id, user_id },
      include: [
        { model: Form, as: "form", attributes: ["title", "description"] },
      ],
    });

    if (!formResponse) {
      return res.status(404).json({
        status: "error",
        message: "Form response not found.",
        data: [],
      });
    }

    // Fetch answers
    const answers = await ResponseDetail.findAll({
      where: { response_id },
      include: [
        { model: Question, as: "question", attributes: ["question_text"] },
      ],
    });

    // Fetch approvals
    const approvals = await Approval.findAll({
      where: { response_id },
      include: [
        {
          model: User,
          as: "approver",
          attributes: ["id", "first_name", "last_name", "email", "role_id"],
        },
      ],
      order: [["step_number", "ASC"]],
    });

    const progress = approvals.map((appr) => ({
      step_number: appr.step_number,
      role_required: appr.role_required,
      approver: appr.approver
        ? {
            id: appr.approver.id,
            name: appr.approver.full_name,
            email: appr.approver.email,
          }
        : null,
      status: appr.status,
      comment: appr.comment,
      updated_on: appr.updated_on,
    }));

    return res.status(200).json({
      status: "success",
      message: "Form progress retrieved successfully",
      data: {
        form: formResponse.form,
        submitted_on: formResponse.created_on,
        status: formResponse.status,
        answers: answers.map((a) => ({
          question: a.question?.question_text,
          answer: a.answer_text,
        })),
        approvals: progress,
      },
    });
  } catch (err) {
    console.error("Error fetching form progress:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while fetching form progress",
      data: [],
    });
  }
};

exports.getInitiatableForms = async (req, res) => {
  try {
    const user = req.user;
    const role = await Role.findByPk(user.role_id);
    if (!role) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid user role" });
    }

    let contextualRole = role.name.toLowerCase();
    if (contextualRole === "pg coordinator") {
      if (user.department_id) {
        contextualRole = "departmental pg coordinator";
      } else if (user.college_id) {
        contextualRole = "college pg coordinator";
      }
    }

    const forms = await Form.findAll({
      include: [{ model: ApprovalFlow, as: "approvalFlow" }],
    });

    const initiatableForms = forms.filter((form) => {
      const flow = form.approvalFlow?.flow_definition;
      if (!flow || !Array.isArray(flow)) return false;
      return flow[0]?.role_required.toLowerCase() === contextualRole;
    });

    return res.status(200).json({
      status: "success",
      message: "Initiatable forms retrieved",
      data: initiatableForms,
    });
  } catch (error) {
    console.error("Error fetching initiatable forms:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
