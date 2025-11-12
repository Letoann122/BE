// requests/donor/BookingDonationRequest.js
const ALLOWED_VOLUMES = [250, 350, 450];
const ALLOWED_SLOTS = ["7:00 - 11:00", "13:00 - 17:00"];

module.exports = (req, res, next) => {
  const { donation_site_id, appointment_slot_id, scheduled_at, notes, volume, time_slot } = req.body || {};
  const errors = {};

  // 1️⃣ Địa điểm hiến máu: bắt buộc & là số
  if (!donation_site_id || Number.isNaN(Number(donation_site_id))) {
    errors.donation_site_id = ["Địa điểm hiến máu không hợp lệ!"];
  }

  // 2️⃣ Khung giờ: bắt buộc & thuộc danh sách cho phép
  if (!time_slot || !ALLOWED_SLOTS.includes(String(time_slot).trim())) {
    errors.time_slot = ["Khung giờ không hợp lệ!"];
  }

  // 3️⃣ scheduled_at: bắt buộc, parse được, và NGÀY >= hôm nay
  let scheduledDate = null;
  if (!scheduled_at || Number.isNaN(Date.parse(scheduled_at))) {
    errors.scheduled_at = ["Thời gian đặt lịch không hợp lệ!"];
  } else {
    scheduledDate = new Date(scheduled_at);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const apptDay = new Date(
      scheduledDate.getFullYear(),
      scheduledDate.getMonth(),
      scheduledDate.getDate()
    );

    if (apptDay < today) {
      errors.scheduled_at = ["Ngày hiến không được nhỏ hơn ngày hiện tại!"];
    }

    // Nếu là hôm nay và chọn ca sáng mà đã quá 11h → không hợp lệ
    if (apptDay.getTime() === today.getTime()) {
      const nowHour = now.getHours();
      if (time_slot === "7:00 - 11:00" && nowHour >= 11) {
        errors.time_slot = ["Ca sáng hôm nay đã kết thúc, vui lòng chọn ca chiều hoặc ngày khác!"];
      }
    }
  }

  // 4️⃣ Dung tích: FE gửi "250ml" | "350ml" | "450ml"
  let preferred_volume_ml = null;
  if (!volume) {
    errors.volume = ["Vui lòng chọn dung tích máu hiến!"];
  } else {
    const parsedVol = Number(String(volume).replace(/\D/g, "")); // "350ml" -> 350
    if (!ALLOWED_VOLUMES.includes(parsedVol)) {
      errors.volume = ["Dung tích không hợp lệ (chỉ 250 / 350 / 450 ml)!"];
    } else {
      preferred_volume_ml = parsedVol;
    }
  }

  // 5️⃣ appointment_slot_id: optional nhưng nếu có thì phải là số
  let slotId = null;
  if (appointment_slot_id != null && appointment_slot_id !== "") {
    if (Number.isNaN(Number(appointment_slot_id))) {
      errors.appointment_slot_id = ["Khung giờ không hợp lệ!"];
    } else {
      slotId = Number(appointment_slot_id);
    }
  }

  // ✅ Nếu có lỗi thì trả về message rõ ràng
  if (Object.keys(errors).length) {
    let message = "Dữ liệu không hợp lệ!";
    if (errors.scheduled_at) message = errors.scheduled_at[0];
    else if (errors.donation_site_id) message = errors.donation_site_id[0];
    else if (errors.time_slot) message = errors.time_slot[0];
    else if (errors.volume) message = errors.volume[0];
    else if (errors.appointment_slot_id) message = errors.appointment_slot_id[0];

    return res.status(422).json({ status: false, message, errors });
  }

  // ✅ Chuẩn hoá dữ liệu cho Controller
  req.validated = {
    donor_id: req.user?.userId || req.user?.id, // verifyToken đã gắn sẵn user
    donation_site_id: Number(donation_site_id),
    appointment_slot_id: slotId,
    time_slot: String(time_slot).trim(),
    scheduled_at: scheduledDate,
    preferred_volume_ml,
    notes: (notes && String(notes).trim()) || null,
  };

  next();
};
