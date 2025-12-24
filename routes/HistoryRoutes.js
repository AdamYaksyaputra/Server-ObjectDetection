const express = require("express");
const {
  getHistorys,
  getHistory,
  getHistoryByToken,
  createHistory,
  updateHistory,
  sendEmergencyAlert,
} = require("../controllers/HistoryController");
const { protect } = require("../controllers/AuthController");

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB in bytes
  },
});

const router = express.Router();

router.get("/api/history", protect, getHistorys);
router.get("/api/history/:id", protect, getHistory);
router.post(
  "/api/history",
  protect,
  upload.single("photo_url"),
  (req, res) => {
    let finalImageURL = req.file
      ? req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename
      : null;

    createHistory(req, res, finalImageURL);
  }
);

// PUT route for updating history from mobile app
router.put(
  "/api/history/:id",
  protect,
  upload.single("photo_url"),
  (req, res) => {
    if (req.file) {
      req.body.photo_url = req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;
    }
    updateHistory(req, res);
  }
);

router.get("/api/historys/token", protect, getHistoryByToken);

// POST route for sending emergency alert to other users
router.post("/api/history/emergency-alert", protect, sendEmergencyAlert);

module.exports = router;
