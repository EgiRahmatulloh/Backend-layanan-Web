import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { connectDB, sequelize } from './config/db.js';
import User from './models/User.js';
import Post from './models/Post.js';
import Chat from './models/Chat.js';
import Like from './models/Like.js';
import Komentar from './models/Komentar.js';
import Group from './models/Group.js';
import GroupMember from './models/GroupMember.js';
import GroupChat from './models/GroupChat.js';
import Story from './models/Story.js';
import Notification from './models/Notification.js';
import authRoutes from './routes/authRoutes.js';
import jwt from 'jsonwebtoken'; // Import jwt

// Define associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Import routes di sini nanti
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import followRoutes from './routes/followRoutes.js';
import komentarRoutes from './routes/komentarRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { cleanupExpiredStories } from './controllers/storyController.js';
import cron from 'node-cron';

dotenv.config();

connectDB();

// Sinkronisasi model dengan alter: true untuk mempertahankan data yang sudah ada
sequelize.sync({ alter: true }).then(() => {
  console.log('Database & tabel disinkronisasi!');
});


const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi CORS
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173','http://127.0.0.1:52005','http://localhost:5174'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Definisikan path untuk uploads dan chat_media
const uploadsDir = path.join(__dirname, '..', 'uploads');
const chatMediaDir = path.join(uploadsDir, 'chat_media');
const groupMediaDir = path.join(uploadsDir, 'group_media');
const storiesDir = path.join(uploadsDir, 'stories');

// Buat direktori jika belum ada
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Direktori ${uploadsDir} berhasil dibuat`);
  }
  if (!fs.existsSync(chatMediaDir)) {
    fs.mkdirSync(chatMediaDir, { recursive: true });
    console.log(`Direktori ${chatMediaDir} berhasil dibuat`);
  }
  if (!fs.existsSync(groupMediaDir)) {
    fs.mkdirSync(groupMediaDir, { recursive: true });
    console.log(`Direktori ${groupMediaDir} berhasil dibuat`);
  }
  if (!fs.existsSync(storiesDir)) {
    fs.mkdirSync(storiesDir, { recursive: true });
    console.log(`Direktori ${storiesDir} berhasil dibuat`);
  }
  console.log('Sistem siap menerima file di:', uploadsDir);
} catch (error) {
  console.error('Gagal membuat direktori:', error);
  process.exit(1);
}

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatMediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat_media-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Batas ukuran file 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  // Izinkan gambar, video, dan dokumen
  const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Jenis file tidak didukung. Hanya file gambar, video, dan dokumen yang diizinkan.'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
}).single('chat_media');

// Routes
app.get('/', (req, res) => {
  res.send('API Sosial Media berjalan...');
});

// Gunakan routes di sini nanti
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/comments', komentarRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Setup static file serving dengan CORS yang lebih permisif untuk uploads
app.use('/uploads', cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}), express.static(uploadsDir));

// Pastikan direktori profiles ada
const profilesDir = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log(`Direktori ${profilesDir} berhasil dibuat`);
}

app.post('/api/upload/chat_media', (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal 10MB' });
      }
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengunggah file' });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    try {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat_media/${req.file.filename}`;
      res.status(200).json({ 
        success: true,
        filePath: `/uploads/chat_media/${req.file.filename}`,
        fileUrl: fileUrl,
        fileName: req.file.filename
      });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ error: 'Terjadi kesalahan saat memproses file' });
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // Sesuaikan dengan origin frontend Anda
    methods: ["GET", "POST"]
  }
});

// Middleware otentikasi untuk Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach decoded user info to socket
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Pengguna terhubung:', socket.id);
  console.log('Authenticated user ID:', socket.user.id); // Log authenticated user ID

  // Join user-specific room based on authenticated user ID
  socket.join(`user_${socket.user.id}`);
  console.log(`User ${socket.user.id} joined room user_${socket.user.id}`);

  socket.on('sendMessage', (message) => {
    io.emit('receiveMessage', message); // Kirim pesan ke semua klien yang terhubung
  });

  socket.on('disconnect', () => {
    console.log('Pengguna terputus:', socket.id);
  });
});

// Setup cron job untuk membersihkan stories yang expired setiap jam
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled story cleanup...');
  try {
    const deletedCount = await cleanupExpiredStories();
    console.log(`Scheduled cleanup completed: ${deletedCount} stories removed`);
  } catch (error) {
    console.error('Error in scheduled cleanup:', error);
  }
});

// Jalankan cleanup pertama kali saat server start
setTimeout(async () => {
  try {
    console.log('Running initial story cleanup...');
    const deletedCount = await cleanupExpiredStories();
    console.log(`Initial cleanup completed: ${deletedCount} stories removed`);
  } catch (error) {
    console.error('Error in initial cleanup:', error);
  }
}, 5000); // 5 detik setelah server start

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log('Story cleanup scheduler aktif - akan berjalan setiap jam (0 * * * *)');
});
