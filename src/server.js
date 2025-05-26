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
import authRoutes from './routes/authRoutes.js';

// Import routes di sini nanti
import userRoutes from './routes/userRoutes.js';
// import postRoutes from './routes/postRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

connectDB();

// Sinkronisasi model (gunakan force: true hanya di lingkungan dev)
sequelize.sync({ force: false }).then(() => {
  console.log('Database & tabel dibuat!');
});


const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi CORS
const allowedOrigins = ['http://localhost:3000'];
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
app.use(helmet());
app.use(morgan('dev'));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Definisikan path untuk uploads dan chat_media
const uploadsDir = path.join(__dirname, '..', 'uploads');
const chatMediaDir = path.join(uploadsDir, 'chat_media');

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
// app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);

// Setup static file serving
app.use('/uploads', express.static(uploadsDir));

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
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Sesuaikan dengan origin frontend Anda
    methods: ["GET", "POST"]
  }
});

// Store untuk menyimpan mapping user_id dengan socket_id
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('Pengguna terhubung:', socket.id);

  // Handle user login/join
  socket.on('userOnline', async (userId) => {
    try {
      userSockets.set(userId, socket.id);
      
      // Update status online di database
      await User.update(
        { is_online: true, last_seen: new Date() },
        { where: { user_id: userId } }
      );
      
      // Broadcast ke semua client bahwa user online
      socket.broadcast.emit('userStatusChanged', {
        userId: userId,
        isOnline: true,
        lastSeen: new Date()
      });
      
      console.log(`User ${userId} is now online`);
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  });

  socket.on('sendMessage', (message) => {
    io.emit('receiveMessage', message); // Kirim pesan ke semua klien yang terhubung
  });

  socket.on('disconnect', async () => {
    console.log('Pengguna terputus:', socket.id);
    
    // Cari user_id berdasarkan socket_id
    let disconnectedUserId = null;
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        userSockets.delete(userId);
        break;
      }
    }
    
    if (disconnectedUserId) {
      try {
        // Update status offline di database
        await User.update(
          { is_online: false, last_seen: new Date() },
          { where: { user_id: disconnectedUserId } }
        );
        
        // Broadcast ke semua client bahwa user offline
        socket.broadcast.emit('userStatusChanged', {
          userId: disconnectedUserId,
          isOnline: false,
          lastSeen: new Date()
        });
        
        console.log(`User ${disconnectedUserId} is now offline`);
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});