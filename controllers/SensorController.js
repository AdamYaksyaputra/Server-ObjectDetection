const formatMessage = require("../utils/formatMessage");
const Sensor = require("../models/Sensor");
const User = require("../models/Users");
const DeviceToken = require("../models/DeviceTokens");
const History = require("../models/History");
const axios = require("axios");

// const io = require("../../index");
const { JWT } = require('google-auth-library');

const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = require("http").Server(app);
const io = new Server(server);

const serviceAccount = require('../objectdetectionflutter.json');

async function getAccessToken() {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const { access_token } = await client.authorize();
  return access_token;
}

// Fungsi kirim push notifikasi via FCM
async function sendPushNotificationFCM({ token, sensor_id, branch_id, history_id }) {
  const accessToken = await getAccessToken();

  const payload = {
    message: {
      token, // Token device user
      notification: {
        title: '⚠️ ALARM KEAMANAN!',
        body: 'Sensor mendeteksi gerakan mencurigakan!',
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'alarm_channel',
          sound: 'default',
          vibrate_timings: ['0s', '3s'], // Vibrate for 3 seconds
          notification_priority: 'PRIORITY_MAX',
          visibility: 'PUBLIC',
        }
      },
      data: {
        type: 'alarm',
        branch_id: String(branch_id),
        sensor_id: String(sensor_id),
        history_id: String(history_id || ''),
        message: 'Sensor mendeteksi gerakan!',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
  };

  console.log("PAYLOAD", payload)

  const projectId = serviceAccount.project_id;
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const response = await axios.post(fcmUrl, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

const sensorActive = async (req, res) => {
  try {
    const { sensor_id, isDetected } = req.body;


    if (!sensor_id || typeof isDetected !== 'boolean') {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const sensor = await Sensor.findByPk(sensor_id);

    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    const branch_id = sensor.branch_id;

    if (isDetected) {
      // Create history record with initial data (status: 1 = pending)
      const newHistory = await History.create({
        sensor_id: sensor_id,
        branch_id: branch_id,
        date: new Date(),
        status: 1, // Pending - waiting for user response
        isEmergency: false, // Will be updated by mobile app if Emergency button clicked
        // user_id, description, photo_url will be added when user responds
      });

      console.log('History created with ID:', newHistory.id);

      const users = await User.findAll({
        where: { branch_id },
        include: [{
          model: DeviceToken,
          as: 'device_tokens',
        }],
      });

      // Langkah 2: Ambil semua device_token unik dari user-user tersebut
      const allTokens = users.flatMap(user => user.device_tokens.map(dt => dt.device_token));
      const uniqueTokens = [...new Set(allTokens)];

      if (uniqueTokens.length === 0) {
        return res.status(200).json({ message: 'Tidak ada device token untuk branch ini.', history_id: newHistory.id });
      }

      // Langkah 3: Kirim notifikasi ke setiap token dengan history_id
      const results = [];
      for (const token of uniqueTokens) {
        try {
          const result = await sendPushNotificationFCM({
            token,
            sensor_id,
            branch_id,
            history_id: newHistory.id, // Include history_id for mobile app to update
          });
          results.push({ token, status: 'sent', response: result });
        } catch (err) {
          results.push({
            token,
            status: 'failed',
            error: err.response?.data || err.message,
          });
        }
      }
      console.log('FCM Results:', results);
      return res.status(200).json({
        message: 'FCM proses selesai',
        total_tokens: uniqueTokens.length,
        history_id: newHistory.id,
        results,
      });
    } else {
      console.log('Sensor tidak mendeteksi, tidak kirim FCM.');
      return res.status(200).json({
        message: 'Sensor tidak mendeteksi, tidak kirim FCM.',
      });
    }
  } catch (error) {
    console.error('Sensor FCM Error:', error);
    return res.status(500).json({
      message: 'Gagal memproses data sensor',
      error: error.message,
    });
  }
};



const getSensor = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data sensor berdasarkan ID/Branch Id
    const sensor = await Sensor.findByPk(id);
    if (!sensor) {
      return res.status(404).json({ message: "Sensor not found" });
    }
    return res.json(sensor);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getSensorByBranchId = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data sensor berdasarkan Branch Id
    const sensor = await Sensor.findAll({
      where: { branch_id: id },
    });
    if (!sensor) {
      return res.status(404).json({ message: "Sensor not found" });
    }
    return res.json(sensor);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSensors = async (req, res) => {
  try {
    const sensors = await Sensor.findAll();
    res.json(sensors);
  } catch (error) {
    console.log(error);
  }
};

const getSensorByToken = async (req, res) => {
  try {
    const loggedInAdminBranchId = req.user.branch_id;
    const sensor = await Sensor.findAll({
      where: { branch_id: loggedInAdminBranchId },
    });
    res.json(sensor);
  } catch (error) {
    console.log(error);
  }
};

const createSensor = async (req, res) => {
  try {
    const {
      code,
      branch_id,
      latitude,
      longitude,
      isOn,
    } = req.body;

    if (
      !code ||
      !branch_id ||
      !latitude ||
      !longitude ||
      isOn === undefined
    ) {
      return res.status(400).json({
        message: "Code, Branch Id, Latitude, and Logitude fields are required.",
      });
    }

    // check code sensor is exist
    const existingSensor = await Sensor.findOne({
      where: { code },
    });

    if (existingSensor) {
      return res.status(400).json({
        message: "Code sensor already exist.",
      });
    }

    const sensor = await Sensor.create({
      code,
      branch_id,
      latitude,
      longitude,
      isOn,
    });

    res.status(201).json({
      message: "Sensor created successfully.",
      data: sensor,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "An error occurred while creating the sensor.",
      error: error.message,
    });
  }
};

const updateSensor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      branch_id,
      latitude,
      longitude,
      isOn,
    } = req.body;

    // Cek apakah sensor dengan ID yang diberikan ada
    const sensor = await Sensor.findByPk(id);
    if (!sensor) {
      return res.status(404).json({ message: "Sensor not found" });
    }

    // Cek apakah code sensor yang diberikan sudah ada
    const existingSensor = await Sensor.findOne({
      where: { code },
    });

    if (existingSensor && existingSensor.id !== Number(id)) {
      return res.status(400).json({
        message: "Code sensor already exist.",
      });
    }
    const sensorUpdate = await Sensor.update(
      {
        code,
        branch_id,
        latitude,
        longitude,
        isOn,
      },
      {
        where: { id },
      }
    );
    res.status(200).json({
      message: 'Sensor updated successfully.',
    });
  } catch (error) {
    console.log(error);
  }
};

const updateSensorRaspberry = async (req, res) => {
  const { code, branch_id, latitude, longitude, isDetected } = req.body;

  // check id sensor in current branch
  const sensor = await Sensor.findOne({
    where: { code, branch_id },
  });
  if (!sensor) {
    return res.status(404).json({ message: "Sensor not found" });
  }

  try {
    // save data sensor
    const dataSensor = await Sensor.update(
      {
        latitude,
        longitude,
        isDetected,
      },
      {
        where: { code, branch_id },
      }
    );
    res.json({
      message: "Sensor updated successfully"
    });
    console.log(dataSensor);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const deleteSensor = async (req, res) => {
  try {
    const { id } = req.params;
    const sensor = await Sensor.destroy({
      where: { id },
    });
    res.json({
      message: 'Sensor deleted successfully.',
    });
  } catch (error) {
    console.log(error);
  }
};

// const updateAllSensorTimes = async (req, res) => {
//   try {
//     const { from_time, to_time } = req.body;
//     const loggedInAdminBranchId = req.user.branch_id;
//     console.log(req.user);

//     const [affectedRows] = await Sensor.update(
//       {
//         from_time,
//         to_time,
//       },
//       {
//         where: { branch_id: loggedInAdminBranchId },
//       }
//     );

//     res.json({
//       message: `Updated ${affectedRows} sensor(s)`,
//       from_time,
//       to_time,
//     });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ message: "An error occurred while updating the sensors" });
//   }
// };

module.exports = {
  getSensor,
  getSensors,
  getSensorByToken,
  createSensor,
  // createToSensor,
  updateSensor,
  updateSensorRaspberry,
  deleteSensor,
  getSensorByBranchId,
  sensorActive
  // updateAllSensorTimes,
};
