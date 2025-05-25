import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password, name } = req.body;

  // Validasi input
  if (!username || !email || !password || !name) {
    return res.status(400).json({ message: 'Harap masukkan semua bidang yang diperlukan' });
  }

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'Pengguna dengan email ini sudah ada' });
    }

    const usernameExists = await User.findOne({ where: { username } });
    if (usernameExists) {
      return res.status(400).json({ message: 'Pengguna dengan username ini sudah ada' });
    }


    const user = await User.create({
      username,
      email,
      password, // Password akan di-hash di model User (hooks)
      name,
    });

    if (user) {
      res.status(201).json({
        id: user.user_id,
        username: user.username,
        email: user.email,
        token: generateToken(user.user_id),
      });
    } else {
      res.status(400).json({ message: 'Data pengguna tidak valid' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.user_id,
        username: user.username,
        email: user.email,
        token: generateToken(user.user_id),
      });
    } else {
      res.status(401).json({ message: 'Email atau password salah' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export { registerUser, loginUser };