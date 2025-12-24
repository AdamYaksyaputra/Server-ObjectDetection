const DeviceToken = require('../models/DeviceTokens');

// Register or update device token
const registerDeviceToken = async (req, res) => {
    try {
        const { device_token, device_type } = req.body;
        const user_id = req.user.id; // From auth middleware

        if (!device_token) {
            return res.status(400).json({ message: 'Device token is required' });
        }

        // Check if token already exists
        const existingToken = await DeviceToken.findOne({
            where: { device_token }
        });

        if (existingToken) {
            // Update existing token with new user_id if different
            await DeviceToken.update(
                {
                    user_id,
                    device_type: device_type || 'android',
                    last_active: new Date()
                },
                { where: { device_token } }
            );
            return res.json({ message: 'Device token updated successfully' });
        }

        // Create new device token
        await DeviceToken.create({
            user_id,
            device_token,
            device_type: device_type || 'android',
            last_active: new Date()
        });

        res.status(201).json({ message: 'Device token registered successfully' });
    } catch (error) {
        console.error('Error registering device token:', error);
        res.status(500).json({ message: 'Error registering device token' });
    }
};

// Delete device token (logout)
const deleteDeviceToken = async (req, res) => {
    try {
        const { device_token } = req.body;

        if (!device_token) {
            return res.status(400).json({ message: 'Device token is required' });
        }

        await DeviceToken.destroy({
            where: { device_token }
        });

        res.json({ message: 'Device token deleted successfully' });
    } catch (error) {
        console.error('Error deleting device token:', error);
        res.status(500).json({ message: 'Error deleting device token' });
    }
};

module.exports = {
    registerDeviceToken,
    deleteDeviceToken
};
