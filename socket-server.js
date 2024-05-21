
// import express from 'express';
// import { Server as HttpServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// const app = express()
// const server = new HttpServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: 'http://localhost:3000',
//   },
// });

// app.use(express.json());

// import cors from "cors";
// import db from './utils/mysql2_connect.js';
// const corsOptions = {
//   credentials: true,
//   origin: (origin, callback) => {
//     callback(null, true);
//   },
// };
// app.use(cors(corsOptions));

// let viewerIdList = [];
// // let roomName = ""

// // 確認連線
// io.on('connection', socket => {

//   const handleSendComment = (newComment, room) => {
//     io.to(room).emit('receiveComment', newComment)
//   }

//   const handlePinnedComment = (pinI, pinP, pinN, pinC, roomCode) => {
//     io.to(roomCode).emit('pinnedAll', pinI, pinP, pinN, pinC)
//   }

//   const handleUnpinComment = (roomCode) => {
//     io.to(roomCode).emit("unpinAll")
//   }


//   // FIXME:人數在離開時對不上
//   const updateLiveStatus = (room) => {
//     const users = io.sockets.adapter.rooms.get(room);
//     if (users) {
//       const liveNum = users.size;
//       console.log(` 目前 '${room}' 中有 ${liveNum} 人`);
//       io.to(room).emit("updateLiveNum", liveNum)
//     } else {
//       console.log(`房間 ${room} 没有用戶`);
//       io.to(room).emit("updateLiveNum", 0)
//     }
//   }

//   const handleUpdateBonus = (data, roomCode) => {
//     socket.to(roomCode).emit("updateBonus", data)
//   }

//   socket.on('sendComment', handleSendComment)
//   socket.on('pinnedComment', handlePinnedComment)
//   socket.on('unpinComment', handleUnpinComment)
//   socket.on('totalBonus', handleUpdateBonus)

//   // 視訊
//   const handleCheckRole = (id, role) => {

//     if (role == 'isStreamer') {
//       socket.emit('streamerStart', id)
//       socket.join(id)
//       console.log(`主播 ${id} 登入`);
//       updateLiveStatus(id);
//       // roomName = id;
//       // console.log({roomName});
//     } else {
//       socket.emit('viewerGo', id, socket.id)
//       console.log(`觀眾 ${id} 登入`);
//     }
//   };

//   const handleJoinStreamerRoom = (roomCode) => {
//     socket.join(roomCode)
//     updateLiveStatus(roomCode);
//     console.log({roomCode});
//     console.log(`一人登入 ${roomCode}`)
//   }

//   const handleUserEnter = (userData, roomCode) => {
//     const item = viewerIdList.find(el => el.viewerId === userData.viewerId)

//     if (item) {
//       console.log('已經在聊天室了');
//     } else if (userData.viewerId === "") {
//       console.log(`你送空ID`);
//     } else {
//       viewerIdList.push(userData)
//       io.to(roomCode).emit('userGo', viewerIdList)
//       console.log({ viewerIdList });
//     }
//   }

//   const handleShowGift = (roomCode, giftRain) => {
//     io.to(roomCode).emit('showGift', giftRain)
//   }

//   const handleDisconnect = () => {
//     const i = viewerIdList.findIndex(viewer => viewer.socketId === socket.id);
//     console.log({ i });
//     if (i !== -1) {
//       viewerIdList.splice(i, 1)
//       io.emit('userGo', viewerIdList)
//     }
//     // updateLiveStatus(roomName)
//     // console.log(`退出房${roomName}`);
//     console.log(`${socket.id}用戶退出`);
//   }

//   socket.on('check-role', handleCheckRole)
//   socket.on('joinRoom', handleJoinStreamerRoom)
//   socket.on('userEnter', handleUserEnter)
//   socket.on('showGift', handleShowGift)
//   socket.on('disconnecting', handleDisconnect)
// })

// server.listen(3001, () => {
//   console.log(`正在連線伺服器 ${port}`)
// })

