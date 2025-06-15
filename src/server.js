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
import postRoutes from './routes/postRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import followRoutes from './routes/followRoutes.js';
import komentarRoutes from './routes/komentarRoutes.js';

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
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
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
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/comments', komentarRoutes);

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
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Sesuaikan dengan origin frontend Anda
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Pengguna terhubung:', socket.id);

  socket.on('sendMessage', (message) => {
    io.emit('receiveMessage', message); // Kirim pesan ke semua klien yang terhubung
  });

  socket.on('disconnect', () => {
    console.log('Pengguna terputus:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
