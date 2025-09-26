require('dotenv').config();
const express = require('express');
const app = express();

const cors = require("cors");

app.use(cors({
  origin: "http://localhost:5173", // hoặc "*"
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
// middleware đọc JSON
app.use(express.json());

// import routes
const apiRoutes = require("./routes/api");
app.use("/", apiRoutes);

app.get("/", (req, res) => {
  res.send("Smart Blood Donation API running...");
});

const PORT = process.env.APP_PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
