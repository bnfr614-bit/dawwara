import { createServer } from 'node:http';
import { loadEnvConfig } from '@next/env';
import next from 'next';
import { Server } from 'socket.io';
import { attachSocketHandlers } from './server/rooms';
import { userFromCookieHeader } from './lib/auth';

// same .env the Next routes see, so both sides sign/verify sessions with one secret
loadEnvConfig(process.cwd());
const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const http = createServer((req, res) => handle(req, res));
  const io = new Server(http, { path: '/ws', maxHttpBufferSize: 200_000 });
  attachSocketHandlers(io, (socket) => userFromCookieHeader(socket.handshake.headers.cookie));
  http.listen(port, '0.0.0.0', () => {
    console.log(`> دوّارة شغالة على http://localhost:${port}`);
  });
});
