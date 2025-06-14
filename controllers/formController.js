const Form = require("../models/form");
const FormResponse = require("../models/formResponse");
const Question = require("../models/question");
const User = require("../models/user");
const Role = require("../models/role");
const ApprovalFlow = require("../models/approvalFlow");
const ResponseDetail = require("../models/ResponseDetail");
const Approval = require("../models/approval");
const {
  createFormNotification,
  createApprovalNotification,
  createSubmissionNotification,
} = require("../notification.utils");

// Utility function to check if user can access a form
const canUserAccessForm = async (user, form) => {
  // Admin can access all forms
  if (user.role_id === 2) {
    return true;
  }

  // Get user's role to compare with form initiator
  const userRole = await Role.findByPk(user.role_id);
  if (!userRole) {
    return false;
  }

  // Check if user's role matches the form's initiator
  return userRole.name.toLowerCase() === form.initiator.toLowerCase();
};

exports.createForm = async (req, res) => {
  const { title, description, initiator } = req.body;

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
      initiator,
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
    const user = req.user;

    // If user is admin, return all forms
    if (user.role_id === 2) {
      const allForms = await Form.findAll({
        where: { deleted_flag: false },
        include: [{ model: ApprovalFlow, as: "approvalFlow" }],
      });

      return res.status(200).json({
        status: "success",
        message: "Initiatable forms retrieved",
        data: allForms,
      });
    }

    const role = await Role.findByPk(user.role_id);
    if (!role) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid user role" });
    }

    const contextualRole = role.name.toLowerCase();

    const initiatableForms = await Form.findAll({
      where: {
        initiator: contextualRole,
        deleted_flag: false,
      },
      include: [{ model: ApprovalFlow, as: "approvalFlow" }],
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

// Retrieve details of a single form (including its non-deleted questions)
exports.getFormById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = req.user;
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

    // Check if user can access this form
    if (!(await canUserAccessForm(user, form))) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You are not authorized to view this form.",
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
  const { id, title, description, initiator } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
      data: [],
    });
  }

  try {
    const user = req.user;
    const form = await Form.findOne({ where: { id, deleted_flag: false } });
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    // Check if user can access this form
    if (!(await canUserAccessForm(user, form))) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You are not authorized to update this form.",
        data: [],
      });
    }

    form.title = title;
    form.description = description;
    form.initiator = initiator;
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
    const user = req.user;
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

    // Check if user can access this form
    if (!(await canUserAccessForm(user, form))) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You are not authorized to delete this form.",
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
    const form = await Form.findByPk(form_id);

    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
      });
    }

    // Check if user can access this form
    if (!(await canUserAccessForm(user, form))) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You are not authorized to submit this form.",
      });
    }

    // Create form response
    const formResponse = await FormResponse.create({
      form_id,
      user_id: user.id,
      status: "pending", // Initial status
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

    let flowDefinition;
    if (approvalFlow && approvalFlow.flow_definition) {
      if (typeof approvalFlow.flow_definition === "string") {
        try {
          flowDefinition = JSON.parse(approvalFlow.flow_definition);
        } catch (parseError) {
          console.error("Error parsing flow_definition:", parseError);
          // Treat as if no valid flow definition exists
          flowDefinition = [];
        }
      } else {
        flowDefinition = approvalFlow.flow_definition;
      }
    } else {
      flowDefinition = [];
    }

    // If no approval steps are defined, or flow definition is empty
    if (!Array.isArray(flowDefinition) || flowDefinition.length === 0) {
      formResponse.status = "approved"; // Auto-approve
      await formResponse.save();

      // Notify the user that their form has been auto-approved
      await createFormNotification(
        user.id,
        `Your ${form.title} form has been automatically approved`,
        form_id,
        `Your submission has been automatically approved as no approval flow was defined for this form. No further action is required.`
      );

      return res.status(201).json({
        status: "success",
        message:
          "Form submitted and automatically approved (no approval flow defined or flow is empty).",
        data: formResponse,
      });
    }

    // Target the first step in the defined flow.
    const firstDefinedApproverStep = flowDefinition[0];

    if (
      !firstDefinedApproverStep ||
      !firstDefinedApproverStep.step ||
      !firstDefinedApproverStep.role_required
    ) {
      // This case handles if flowDefinition[0] is malformed.
      formResponse.status = "approved";
      await formResponse.save();

      // Notify the user that their form has been auto-approved due to invalid flow
      await createFormNotification(
        user.id,
        `Your ${form.title} form has been automatically approved`,
        form_id,
        `Your submission has been automatically approved as the approval flow configuration was invalid. No further action is required.`
      );

      return res.status(201).json({
        status: "success",
        message:
          "Form submitted and automatically approved (first approval step in flow was invalid).",
        data: formResponse,
      });
    }

    const targetStepForApproval = firstDefinedApproverStep;
    const targetStepNumber = targetStepForApproval.step;
    const roleNameFromFlow = targetStepForApproval.role_required;
    const roleRequiredLower = roleNameFromFlow.toLowerCase(); // Find user for this step
    let approver;
    // Note: Role IDs are based on your provided seeded data:
    // HOD: 4, PG Coordinator: 8
    if (roleRequiredLower === "departmental pg coordinator") {
      approver = await User.findOne({
        where: {
          role_id: 8, // PG Coordinator
          department_id: user.department_id,
        },
      });

      // If no departmental PG coordinator found, try to find any PG coordinator in the same college
      if (!approver) {
        approver = await User.findOne({
          where: {
            role_id: 8, // PG Coordinator
            college_id: user.college_id,
          },
        });
      }
    } else if (roleRequiredLower === "college pg coordinator") {
      approver = await User.findOne({
        where: {
          role_id: 8, // PG Coordinator
          college_id: user.college_id,
        },
      });
    } else if (roleRequiredLower === "hod") {
      approver = await User.findOne({
        where: {
          role_id: 4, // HOD
          department_id: user.department_id,
        },
      });

      // If no HOD found in the same department, try to find any HOD in the same college
      if (!approver) {
        approver = await User.findOne({
          where: {
            role_id: 4, // HOD
            college_id: user.college_id,
          },
        });
      }
    } else {
      // For other roles like "Dean", "Dean SPS", generic "PG Coordinator" etc.
      const role = await Role.findOne({
        where: { name: roleRequiredLower }, // Use original casing for DB lookup
      });
      if (!role) {
        throw new Error(`Role '${roleNameFromFlow}' not found in Role table.`);
      }

      // Try to find the approver with contextual matching (college/department)
      if (user.college_id) {
        approver = await User.findOne({
          where: {
            role_id: role.id,
            college_id: user.college_id,
          },
        });
      }

      // If no college-specific approver found, try general lookup
      if (!approver) {
        approver = await User.findOne({
          where: { role_id: role.id },
        });
      }
    }

    if (!approver) {
      // Instead of throwing an error, auto-approve and notify
      formResponse.status = "approved";
      await formResponse.save();

      await createFormNotification(
        user.id,
        `Your ${form.title} form has been automatically approved`,
        form_id,
        `Your submission has been automatically approved as no suitable approver was found for the role '${roleNameFromFlow}'. No further action is required.`
      );

      return res.status(201).json({
        status: "success",
        message: `Form submitted and automatically approved (no approver found for role '${roleNameFromFlow}').`,
        data: formResponse,
      });
    }

    // Create first approval entry
    const approval = await Approval.create({
      response_id: formResponse.id,
      step_number: targetStepNumber,
      role_required: roleNameFromFlow,
      approver_id: approver.id,
      status: "pending", // Explicitly set status for new approval
    });

    // Notify the submitter that their form has been submitted and is pending approval
    await createSubmissionNotification(
      user.id,
      `Your ${form.title} form has been submitted successfully`,
      formResponse.id,
      `Your form has been submitted and is now awaiting approval. You will be notified when there are updates to your submission.`
    );

    // Notify the approver that they have a new form to review
    await createApprovalNotification(
      approver.id,
      `New ${form.title} form requires your approval`,
      approval.id,
      `A new form submission from ${user.first_name} ${user.last_name} requires your review and approval. Please review it at your earliest convenience.`
    );

    return res.status(201).json({
      status: "success",
      message: "Form submitted and routed for approval.",
      data: formResponse,
    });
  } catch (error) {
    console.error("Submit response error:", error.message, error.stack); // Log full stack
    // Ensure formResponse status is not left hanging if created
    // Depending on policy, you might want to mark formResponse as 'failed' or clean it up
    return res.status(500).json({
      status: "error",
      message: error.message || "Submission failed due to an internal error.",
    });
  }
};

exports.getFormProgress = async (req, res) => {
  try {
    const { response_id } = req.params;
    const user = req.user;

    // Fetch the form response
    const formResponse = await FormResponse.findOne({
      where: { id: response_id },
      include: [
        { model: Form, as: "form", attributes: ["id", "title", "description"] },
      ],
    });

    if (!formResponse) {
      return res.status(404).json({
        status: "error",
        message: "Form response not found.",
        data: [],
      });
    }

    // Check access control: user can view their own submissions or if they're admin
    // or if they're involved in the approval process
    const isOwner = formResponse.user_id === user.id;
    const isAdmin = user.role_id === 2;

    // Check if user is involved in approval process
    const isApprover = await Approval.findOne({
      where: {
        response_id: response_id,
        approver_id: user.id,
      },
    });

    if (!isOwner && !isAdmin && !isApprover) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You are not authorized to view this form progress.",
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
            first_name: appr.approver.first_name,
            last_name: appr.approver.last_name,
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
        id: formResponse.id,
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
