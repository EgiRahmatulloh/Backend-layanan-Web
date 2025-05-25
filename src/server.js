import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.send('API Sosial Media berjalan...');
});

// Gunakan routes di sini nanti
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);

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