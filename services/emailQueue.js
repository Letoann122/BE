"use strict";

const { EmailJob } = require("../models");

module.exports = {
  async enqueue({ email, subject, template, payload, scheduled_at }) {
    return EmailJob.create({
      email,
      subject,
      template,
      payload,
      scheduled_at,
      status: "pending",
    });
  },
};
