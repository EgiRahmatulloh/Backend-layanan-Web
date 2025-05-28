import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);

      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      console.log('User from DB:', req.user);
      
      // Update last_seen timestamp
      if (req.user) {
        await User.update(
          { last_seen: new Date() },
          { where: { user_id: req.user.user_id } }
        );
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Token tidak valid, otorisasi ditolak' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Tidak ada token, otorisasi ditolak' });
  }
};