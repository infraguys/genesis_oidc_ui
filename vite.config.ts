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

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

import { API_CORE_PREFIX } from './src/services/apiPrefix';

export default defineConfig(({ mode }) => {
  const envDir = new URL('.', import.meta.url).pathname;
  const env = loadEnv(mode, envDir, '');

  return {
    define: {
      'import.meta.env.GENESIS_CLIENT_ID': JSON.stringify(env.GENESIS_CLIENT_ID ?? ''),
      'import.meta.env.GENESIS_CLIENT_SECRET': JSON.stringify(env.GENESIS_CLIENT_SECRET ?? ''),
    },
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      allowedHosts: ['auth.genesis-core.local'],
      proxy: {
        [API_CORE_PREFIX]: {
          target: 'http://127.0.0.1:11010',
          changeOrigin: true,
          rewrite: (path) => (path.startsWith(API_CORE_PREFIX) ? path.slice(API_CORE_PREFIX.length) : path),
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
              proxyReq.setHeader('X-Forwarded-Prefix', API_CORE_PREFIX);
            });
          },
        },
      },
    },
  };
});
