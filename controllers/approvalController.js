const Form = require("../models/form");
const User = require("../models/user");
const Role = require("../models/role");
const ApprovalFlow = require("../models/approvalFlow");
const ResponseDetail = require("../models/ResponseDetail");
const Approval = require("../models/approval");
const FormResponse = require("../models/formResponse");
const {
  createApprovalNotification,
} = require("../notification.utils");

exports.createApprovalFlow = async (req, res) => {
  const { form_id, flow_definition } = req.body;

  if (
    !flow_definition ||
    !Array.isArray(flow_definition) ||
    flow_definition.length === 0
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid flow_definition array is required",
      data: [],
    });
  }

  try {
    const form = await Form.findByPk(form_id);
    if (!form) {
      return res.status(404).json({
        status: "error",
        message: "Form not found",
        data: [],
      });
    }

    const approvalFlow = await ApprovalFlow.create({
      form_id: form_id,
      flow_definition,
    });

    return res.status(201).json({
      status: "success",
      message: "Approval flow created successfully",
      data: approvalFlow,
    });
  } catch (error) {
    console.error("Error creating approval flow:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the approval flow",
      data: [],
    });
  }
};

exports.updateFormApprovalFlow = async (req, res) => {
  const { form_id, flow_definition } = req.body;

  if (!form_id) {
    return res.status(400).json({
      status: "error",
      message: "Form ID is required",
      data: [],
    });
  }

  if (
    !flow_definition ||
    !Array.isArray(flow_definition) ||
    flow_definition.length === 0
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid flow_definition array is required",
      data: [],
    });
  }

  try {
    const approvalFlow = await ApprovalFlow.findOne({ where: { form_id } });

    if (!approvalFlow) {
      return res.status(404).json({
        status: "error",
        message: "Approval flow not found for the given form ID",
        data: [],
      });
    }

    approvalFlow.flow_definition = flow_definition;
    await approvalFlow.save();

    return res.status(200).json({
      status: "success",
      message: "Approval flow updated successfully",
      data: approvalFlow,
    });
  } catch (error) {
    console.error("Error updating approval flow:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the approval flow",
      data: [],
    });
  }
};

exports.getApprovalFlows = async (req, res) => {
  try {
    const approvals = await ApprovalFlow.findAll({
      include: [
        {
          model: Form,
          as: "form",
        },
      ],
    });
    return res.status(200).json({
      status: "success",
      message: "Forms and approvals retrieved successfully",
      data: approvals,
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

exports.handleApproval = async (req, res) => {
  const { approval_id } = req.params;
  const { action, comment } = req.body;
  const user_id = req.user.id;

  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid action",
    });
  }

  try {
    const approval = await Approval.findByPk(approval_id);
    if (
      !approval ||
      approval.approver_id !== user_id ||
      approval.status !== "pending"
    ) {
      return res.status(403).json({
        status: "error",
        message: "Not authorized or already processed",
      });
    }

    // Update current approval
    approval.status = action;
    approval.comment = comment || "";
    await approval.save();

    // If rejected, update the whole form status
    const formResponse = await FormResponse.findByPk(approval.response_id);

    // Get form details for notifications
    const form = await Form.findByPk(formResponse.form_id);

    if (action === "rejected") {
      formResponse.status = "rejected";
      await formResponse.save();

      // Notify the form initiator about rejection
      await createApprovalNotification(
        formResponse.user_id,
        `Your ${form.title} form has been rejected`,
        approval.id,
        `Your form was reviewed but could not be approved at this time. ${
          comment
            ? `Reviewer comment: ${comment}`
            : "No additional comments were provided."
        }`
      );

      return res
        .status(200)
        .json({ status: "success", message: "Form rejected." });
    }

    // Proceed to next step
    const approvalFlow = await ApprovalFlow.findOne({
      where: { form_id: formResponse.form_id },
    });

    let flowDefinition = approvalFlow.flow_definition;
    if (typeof flowDefinition === "string") {
      flowDefinition = JSON.parse(flowDefinition);
    }

    const nextStep = flowDefinition.find(
      (step) => step.step === approval.step_number + 1
    );
    if (!nextStep) {
      // Final approval
      formResponse.status = "approved";
      await formResponse.save();

      // Notify initiator about final approval
      await createApprovalNotification(
        formResponse.user_id,
        `Your ${form.title} form has been fully approved`,
        approval.id,
        `Congratulations! Your form has completed all approval steps and has been fully approved.`
      );

      return res
        .status(200)
        .json({ status: "success", message: "Form fully approved." });
    } // Find next approver
    let approver;
    const initiator = await User.findByPk(formResponse.user_id);
    const roleRequiredLower = nextStep.role_required.toLowerCase();

    // Note: Role IDs are based on seeded data:
    // student: 1, admin: 2, college dean: 3, hod: 4, dean sps: 5, sub-dean sps: 6, college pg coordinator: 7, departmental pg coordinator: 8
    if (roleRequiredLower === "departmental pg coordinator") {
      approver = await User.findOne({
        where: {
          role_id: 8, // Departmental PG Coordinator
          department_id: initiator.department_id,
        },
      });

      // If no departmental PG coordinator found, try to find any PG coordinator in the same college
      if (!approver) {
        approver = await User.findOne({
          where: {
            role_id: 8, // Departmental PG Coordinator
            college_id: initiator.college_id,
          },
        });
      }
    } else if (roleRequiredLower === "college pg coordinator") {
      approver = await User.findOne({
        where: {
          role_id: 7, // College PG Coordinator
          college_id: initiator.college_id,
        },
      });
    } else if (roleRequiredLower === "hod") {
      approver = await User.findOne({
        where: {
          role_id: 4, // HOD
          department_id: initiator.department_id,
        },
      });

      // If no HOD found in the same department, try to find any HOD in the same college
      if (!approver) {
        approver = await User.findOne({
          where: {
            role_id: 4, // HOD
            college_id: initiator.college_id,
          },
        });
      }
    } else {
      // For other roles like "college dean", "dean sps", "sub-dean sps", etc.
      const roleRecord = await Role.findOne({
        where: { name: nextStep.role_required },
      });
      if (!roleRecord) {
        throw new Error(
          `Role '${nextStep.role_required}' not found in Role table.`
        );
      }

      // Try to find the approver with contextual matching (college/department)
      if (initiator.college_id) {
        approver = await User.findOne({
          where: {
            role_id: roleRecord.id,
            college_id: initiator.college_id,
          },
        });
      }

      // If no college-specific approver found, try general lookup
      if (!approver) {
        approver = await User.findOne({
          where: { role_id: roleRecord.id },
        });
      }
    }

    if (!approver) {
      throw new Error(
        `Next approver for role '${nextStep.role_required}' (step ${nextStep.step}) not found.`
      );
    }

    // Create next approval entry
    const newApproval = await Approval.create({
      response_id: formResponse.id,
      step_number: nextStep.step,
      role_required: nextStep.role_required,
      approver_id: approver.id,
    });

    // Notify the initiator about progress
    await createApprovalNotification(
      formResponse.user_id,
      `Your ${form.title} form has been approved at step ${approval.step_number}`,
      approval.id,
      `Your form has been approved at step ${approval.step_number} and has been forwarded to the next approver.`
    );

    // Notify the next approver
    await createApprovalNotification(
      approver.id,
      `New ${form.title} form requires your approval`,
      newApproval.id,
      `A new form submission requires your review and approval. Please review it at your earliest convenience.`
    );

    return res
      .status(200)
      .json({ status: "success", message: "Form approved and routed." });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Approval failed." });
  }
};

exports.getApprovalFlowByFormId = async (req, res) => {
  const { form_id } = req.params;

  try {
    const approvalFlow = await ApprovalFlow.findOne({
      where: { form_id },
      include: [
        {
          model: Form,
          as: "form",
          attributes: ["id", "title", "description"],
        },
      ],
    });

    if (!approvalFlow) {
      return res.status(404).json({
        status: "error",
        message: "Approval flow not found for the given form ID",
        data: null,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Approval flow retrieved successfully",
      data: approvalFlow,
    });
  } catch (error) {
    console.error("Error retrieving approval flow by form ID:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the approval flow",
      data: null,
    });
  }
};

exports.getPendingApprovals = async (req, res) => {
  const user_id = req.user.id;

  try {
    const approvals = await Approval.findAll({
      where: {
        approver_id: user_id,
        status: "pending",
      },
      include: [
        {
          model: FormResponse,
          as: "response",
          include: [
            {
              model: Form,
              as: "form",
              attributes: ["title", "description"],
            },
            {
              model: User,
              as: "user",
              attributes: ["id", "first_name", "last_name", "email"],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      data: approvals,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching pending approvals",
    });
  }
};

exports.getFormApprovalDetails = async (req, res) => {
  const approvalId = req.params.approval_id;

  try {
    const approval = await Approval.findByPk(approvalId, {
      include: [
        {
          model: FormResponse,
          as: "response",
          include: [
            {
              model: Form,
              as: "form",
              attributes: ["title", "description"],
            },
            {
              model: ResponseDetail,
              as: "details",
            },
            {
              model: User,
              as: "user",
              attributes: ["first_name", "last_name", "email"],
            },
          ],
        },
      ],
    });

    if (!approval) {
      return res.status(404).json({
        status: "error",
        message: "Approval not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: approval,
    });
  } catch (error) {
    console.error("Error fetching approval details:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching approval details",
    });
  }
};
