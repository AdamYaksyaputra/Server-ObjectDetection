const History = require('../models/History');
const multer = require('multer');
const path = require('path');
const User = require('../models/Users');
const Sensor = require('../models/Sensor');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './storage/app/public/upload')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage }).single('photo_url')

const getHistorys = async (req, res) => {
    try {
        const dataHistorys = await History.findAll(
            // get detail users
            {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: {
                            exclude: ['password']
                        }
                    },
                ],
            }
        );
        res.json(dataHistorys);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data.' });
    }
}

const getHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const dataHistory = await History.findByPk(id);
        res.json(dataHistory);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data.' });
    }
}

const getHistoryByToken = async (req, res) => {
    try {
        const loggedInAdminBranchId = req.user.branch_id;
        const dataHistory = await History.findAll({
            where: { branch_id: loggedInAdminBranchId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: {
                        exclude: ['password']
                    }
                },
                {
                    model: Sensor,
                    as: 'sensor',
                }
            ],
        });
        res.json(dataHistory);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data.' });
    }
}

const createHistory = async (req, res, photo_url) => {
    try {
        const { sensor_id, description, date, user_id, branch_id, isEmergency, status } = req.body;
        const dataHistory = await History.create({
            sensor_id,
            description,
            date,
            photo_url,
            user_id,
            branch_id,
            isEmergency: isEmergency === '1' || isEmergency === true ? true : false,
            status: status !== undefined ? status : 1,
        });
        res.json(dataHistory);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data.' });
    }
};

// Update existing history (called from mobile app after sensor trigger)
const updateHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, description, isEmergency, status, photo_url: bodyPhotoUrl } = req.body;

        // Find existing history
        const history = await History.findByPk(id);
        if (!history) {
            return res.status(404).json({ message: 'History not found' });
        }

        // Handle photo upload if present
        // Priority: bodyPhotoUrl (full URL from route) > existing photo_url
        let photo_url = history.photo_url;
        if (bodyPhotoUrl) {
            photo_url = bodyPhotoUrl; // Full URL set by route handler
        }

        console.log('Updating history with photo_url:', photo_url);

        // Update history with user input
        await History.update({
            user_id: user_id || history.user_id,
            description: description || history.description,
            isEmergency: isEmergency !== undefined ? (isEmergency === '1' || isEmergency === true) : history.isEmergency,
            status: status !== undefined ? parseInt(status) : history.status,
            photo_url: photo_url,
        }, {
            where: { id }
        });

        const updatedHistory = await History.findByPk(id);
        res.json({ success: true, data: updatedHistory });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate data.' });
    }
};

// Send emergency alert - Update history isEmergency and notify other users
const sendEmergencyAlert = async (req, res) => {
    try {
        const { history_id } = req.body;
        const requesting_user_id = req.user.id;
        const branch_id = req.user.branch_id;

        // Update history to mark as emergency
        if (history_id) {
            await History.update(
                { isEmergency: true },
                { where: { id: history_id } }
            );
        }

        // Get other users in same branch (exclude requesting user)
        const DeviceToken = require('../models/DeviceTokens');
        const users = await User.findAll({
            where: {
                branch_id: branch_id,
                id: { [require('sequelize').Op.ne]: requesting_user_id }
            },
            include: [{
                model: DeviceToken,
                as: 'device_tokens',
            }],
        });

        // Collect all device tokens
        const allTokens = users.flatMap(user => user.device_tokens.map(dt => dt.device_token));
        const uniqueTokens = [...new Set(allTokens)];

        if (uniqueTokens.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Emergency marked but no other users to notify',
                tokens_sent: 0
            });
        }

        // Send FCM to other users
        const axios = require('axios');
        const { JWT } = require('google-auth-library');
        const serviceAccount = require('../objectdetectionflutter.json');

        const client = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        const { access_token } = await client.authorize();

        const projectId = serviceAccount.project_id;
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        const results = [];
        for (const token of uniqueTokens) {
            try {
                const payload = {
                    message: {
                        token,
                        notification: {
                            title: '🚨 PERMINTAAN BANTUAN!',
                            body: 'Rekan membutuhkan bantuan segera!',
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                channel_id: 'alarm_channel',
                                sound: 'default',
                                notification_priority: 'PRIORITY_MAX',
                            }
                        },
                        data: {
                            type: 'emergency_help',
                            history_id: String(history_id || ''),
                            message: 'Rekan membutuhkan bantuan!',
                        },
                    },
                };

                const response = await axios.post(fcmUrl, payload, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        'Content-Type': 'application/json',
                    },
                });
                results.push({ token, status: 'sent' });
            } catch (err) {
                results.push({ token, status: 'failed', error: err.message });
            }
        }

        res.json({
            success: true,
            message: 'Emergency alert sent',
            tokens_sent: uniqueTokens.length,
            results
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Gagal mengirim emergency alert' });
    }
};

module.exports = { getHistoryByToken, createHistory, updateHistory, sendEmergencyAlert, getHistorys, getHistory };
