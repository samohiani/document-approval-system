const Form = require("../models/form");
const ApprovalFlow = require("../models/approvalFlow");

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
