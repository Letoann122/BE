"use strict";

const { Appointment, User, BloodType } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  async getByCampaign(req, res) {
    try {
      const { campaign_id } = req.query;

      if (!campaign_id)
        return res.json({
          status: false,
          message: "Thiếu campaign_id!"
        });

      const list = await Appointment.findAll({
        where: { campaign_id },
        include: [
          {
            model: User,
            as: "donor",
            attributes: ["full_name", "blood_group"]
          },
          {
            model: BloodType,
            as: "blood_type",
          },
        ],
        order: [["scheduled_at", "ASC"]],
      });

      return res.json({
        status: true,
        data: list,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  },
};
