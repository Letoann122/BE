"use strict";

const { Campaign, Appointment, User } = require("../../models");
const { Op } = require("sequelize");

module.exports = {

    async getAllCampaigns(req, res) {
        try {
            let { type, time } = req.query;

            const where = {};

            if (type === "0") where.is_emergency = 0;
            if (type === "1") where.is_emergency = 1;

            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();

            if (time === "this_month") {
                where.start_date = {
                    [Op.between]: [`${year}-${month}-01`, `${year}-${month}-31`],
                };
            }
            if (time === "last_month") {
                const lastMonth = month - 1 === 0 ? 12 : month - 1;
                const lastYear = lastMonth === 12 ? year - 1 : year;

                where.start_date = {
                    [Op.between]: [
                        `${lastYear}-${lastMonth}-01`,
                        `${lastYear}-${lastMonth}-31`,
                    ],
                };
            }
            if (time === "this_year") {
                where.start_date = {
                    [Op.between]: [`${year}-01-01`, `${year}-12-31`],
                };
            }

            const campaigns = await Campaign.findAll({
                where,
                order: [["created_at", "DESC"]],
                include: [
                    { model: User, as: "creator" }
                ],
            });

            return res.json({
                status: true,
                message: "Lấy danh sách chiến dịch thành công",
                data: campaigns,
            });

        } catch (err) {
            console.error("ERR getAllCampaigns:", err);
            return res.status(500).json({
                status: false,
                message: "Lỗi server khi lấy danh sách chiến dịch",
            });
        }
    },
    async getCampaignDetail(req, res) {
        try {
            const id = req.params.id;

            const campaign = await Campaign.findOne({
                where: { id },
                include: [
                    { model: User, as: "creator" }
                ],
            });

            if (!campaign) {
                return res.status(404).json({
                    status: false,
                    message: "Không tìm thấy chiến dịch",
                });
            }

            return res.json({
                status: true,
                message: "Lấy chi tiết chiến dịch thành công",
                data: campaign,
            });

        } catch (err) {
            console.error("ERR getCampaignDetail:", err);
            return res.status(500).json({
                status: false,
                message: "Lỗi server",
            });
        }
    },

    async createCampaign(req, res) {
        try {
            const { title, content, start_date, end_date, is_emergency, location } = req.body;
            const createdBy = req.user.userId;

            if (!title || !content || !start_date || !end_date) {
                return res.json({
                    status: false,
                    message: "Vui lòng nhập đầy đủ thông tin",
                });
            }

            const newCampaign = await Campaign.create({
                title,
                content,
                start_date,
                end_date,
                location,
                is_emergency: is_emergency ? 1 : 0,
                created_by: createdBy,
            });

            return res.status(201).json({
                status: true,
                message: "Tạo chiến dịch thành công",
                data: newCampaign,
            });

        } catch (err) {
            console.error("ERR createCampaign:", err);
            return res.status(500).json({
                status: false,
                message: "Lỗi server khi tạo chiến dịch",
            });
        }
    },
    async updateCampaign(req, res) {
        try {
            const id = req.params.id;
            const { title, content, start_date, end_date, is_emergency, location } = req.body;

            const campaign = await Campaign.findByPk(id);
            if (!campaign) {
                return res.json({
                    status: false,
                    message: "Không tìm thấy chiến dịch",
                });
            }

            await campaign.update({
                title,
                content,
                start_date,
                end_date,
                location,
                is_emergency: is_emergency ? 1 : 0,
            });

            return res.json({
                status: true,
                message: "Cập nhật chiến dịch thành công",
                data: campaign,
            });

        } catch (err) {
            console.error("ERR updateCampaign:", err);
            return res.status(500).json({
                status: false,
                message: "Lỗi server khi cập nhật chiến dịch",
            });
        }
    },
    async closeCampaign(req, res) {
        try {
            const id = req.params.id;

            const campaign = await Campaign.findByPk(id);
            if (!campaign) {
                return res.json({
                    status: false,
                    message: "Không tìm thấy chiến dịch",
                });
            }

            await campaign.update({
                end_date: new Date(),
            });

            return res.json({
                status: true,
                message: "Đã đóng chiến dịch thành công",
            });

        } catch (err) {
            console.error("ERR closeCampaign:", err);
            return res.status(500).json({
                status: false,
                message: "Lỗi server khi đóng chiến dịch",
            });
        }
    },
};
