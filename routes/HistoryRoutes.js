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
  upload.array("photos", 5), // Support up to 5 photos
  (req, res) => {
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = req.files.map(file =>
        req.protocol + "://" + req.get("host") + "/uploads/" + file.filename
      );
    }
    // For backward compatibility, also check single file
    if (req.file) {
      photoUrls.push(req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename);
    }
    createHistory(req, res, photoUrls.length > 0 ? photoUrls : null);
  }
);

// PUT route for updating history from mobile app
router.put(
  "/api/history/:id",
  protect,
  upload.array("photos", 5), // Support up to 5 photos
  (req, res) => {
    if (req.files && req.files.length > 0) {
      req.body.photo_url = req.files.map(file =>
        req.protocol + "://" + req.get("host") + "/uploads/" + file.filename
      );
    } else if (req.file) {
      // Backward compatibility for single file
      req.body.photo_url = [req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename];
    }
    updateHistory(req, res);
  }
);

router.get("/api/historys/token", protect, getHistoryByToken);

// POST route for sending emergency alert to other users
router.post("/api/history/emergency-alert", protect, sendEmergencyAlert);

module.exports = router;
