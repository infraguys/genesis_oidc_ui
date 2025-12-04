/*
 * Copyright 2025 Genesis Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['auth.genesis-core.local'],
    proxy: {
      '/genesis': {
        target: 'http://127.0.0.1:11010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/genesis/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const forwardedProto =
              (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
            const forwardedHostHeader =
              (req.headers['x-forwarded-host'] as string | undefined) ??
              (req.headers.host as string | undefined);

            let host = forwardedHostHeader;
            let port: string | undefined;

            if (forwardedHostHeader && forwardedHostHeader.includes(':')) {
              const [parsedHost, parsedPort] = forwardedHostHeader.split(':');
              host = parsedHost;
              port = parsedPort;
            } else if (req.socket.localPort) {
              port = String(req.socket.localPort);
            }

            if (host) {
              proxyReq.setHeader('X-Forwarded-Host', host);
            }

            if (port) {
              proxyReq.setHeader('X-Forwarded-Port', port);
            }

            proxyReq.setHeader('X-Forwarded-Proto', forwardedProto);
            proxyReq.setHeader('X-Forwarded-Prefix', '/genesis');
          });
        },
      },
    },
  },
});
