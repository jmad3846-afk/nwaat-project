# Nwaat workshop frontend

Arabic RTL Next.js 16 / React 19 / TypeScript client for the Laravel API in `../backend of nwaat`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000/api`; set it before building when deploying. To use the frontend from another device on the LAN, set `NEXT_PUBLIC_API_URL=http://<PC-LAN-IP>:8000/api` in `.env.local`, configure the backend's `CORS_ALLOWED_ORIGINS` to include `http://<PC-LAN-IP>:3000`, then restart both servers. The backend `start-api.ps1` listens on the network; allow port 8000 through Windows Firewall only on trusted private networks. Follow the backend README to configure MySQL, migrate the schema, and seed your own administrator credentials.

To open the dev frontend from another device on the same network, use the PC's LAN address (for example, `http://10.187.123.237:3000`) and set `NEXT_PUBLIC_API_URL` in `.env.local` to `http://<PC-LAN-IP>:8000/api`. The Laravel server must be reachable on the network and allow the frontend origin through CORS. Restart Next.js after changing `.env.local`.

The app checks `/auth/me` on reload, stores an eight-hour Sanctum bearer token in localStorage, and renders navigation for the authenticated role. Server authorization enforces the role and technician's assigned desk on every request. A 401 clears the session. There is no offline/demo database or automatic import of the old `nawa-workshop` localStorage records.

Available screens: ticket dashboard/search, intake and dual receipts, diagnosis and estimates, customer approval and desk routing, technician code verification/repair/timer/parts usage, delivery checkout, inventory, staff archive and desks, and administrator workshop settings. WhatsApp buttons open prefilled messages for the operator to send.

Customer QR links open `/track/<random-token>` without a staff login. Status, cost, and estimated remaining time refresh every 15 seconds. The public API excludes customer names, phone numbers, device passcodes and internal notes. Receipt B's security code is only returned at intake; print it before closing the receipt.

Cairo, Inter and JetBrains Mono are self-hosted by Next's font loader after the build. Layouts support desktop and tablet; cards, inputs, badges and keyboard focus use high-contrast dark styling.

```powershell
npm run lint
npm run build
npm start
npm audit
```

`lint` runs TypeScript validation. Production builds explicitly use webpack because the default bundler omitted the dynamic QR tracking route in this Windows environment. The build must include `/track/[token]`.

Use HTTPS in production, explicit API CORS origins, and a reachable `FRONTEND_URL` in Laravel for printed QR links. Browser localStorage tokens are available to scripts on this origin: keep untrusted HTML and third-party scripts out of the authenticated application.
