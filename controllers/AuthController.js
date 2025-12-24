const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const DeviceToken = require('../models/DeviceTokens');
const { Op } = require('sequelize');


const jwtSecret = process.env.JWT_SECRET;

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'security') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { id, name, role, branch_id } = user;
    const modifiedUser = { id, name, email, role, branch_id };

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, branch_id: user.branch_id }, jwtSecret, {
      expiresIn: '1h',
    });

    res.json({ token, user: modifiedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const loginWithMobile = async (req, res) => {
  const { email, password, device_token, device_type } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'security') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Buat JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const { id, name, role, branch_id } = user;
    const modifiedUser = { id, name, email, role, branch_id };

    if (device_token) {
      try {
        const existingToken = await DeviceToken.findOne({
          where: { device_token },
        });

        if (existingToken) {
          // Token sudah ada → tinggal update user_id & last_active
          await existingToken.update({
            user_id: user.id,
            last_active: new Date(),
          });
        } else {
          // Token belum ada → buat baru
          await DeviceToken.create({
            user_id: user.id,
            device_token,
            device_type: device_type || 'android',
            last_active: new Date(),
          });
        }
      } catch (err) {
        console.error('Gagal menyimpan device_token:', err.message || err);
      }
    }

    res.json({ token, user: modifiedUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

function generateToken(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  return token;
}

module.exports = {
  login,
  loginWithMobile,
  protect,
  generateToken,
};