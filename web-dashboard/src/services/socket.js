import { io } from 'socket.io-client';

let socket;

export const connectSocket = (token) => {
  socket = io('http://localhost:3000', {
    auth: { token },
  });
  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));
  return socket;
};

export const joinWard = (wardId) => {
  if (socket) socket.emit('join_ward', wardId);
};

export const onNewIssue = (cb) => {
  if (socket) socket.on('new_issue', cb);
};

export const onStatusChange = (cb) => {
  if (socket) socket.on('status_change', cb);
};

export const onSLABreach = (cb) => {
  if (socket) socket.on('sla_breach', cb);
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};