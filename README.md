# Qrib

Qrib is a full-stack student accommodation platform built for Kenyan university students. It connects students with verified hosts, supports the full booking and payment lifecycle, and provides role-specific dashboards for students, hosts, and administrators.

Live: [qrib-mu.vercel.app](https://qrib-mu.vercel.app) · API: [qrib-f4sk.onrender.com](https://qrib-f4sk.onrender.com)

---

## Features

### Students
- Search and filter accommodation by location, budget, property type, and university
- Smart affordability calculator — enter your monthly budget and properties are ranked and badged by affordability ratio (affordable / stretching / over budget)
- Walking time to university gate calculated from property coordinates using the Haversine formula
- Semester-based availability badges showing which semester a property is available
- True monthly cost display — rent + water + electricity shown upfront
- Save favourite listings
- Book properties with a move-in date
- M-Pesa STK Push payment via Safaricom Daraja sandbox
- Real-time notifications and in-app messaging with hosts
- Email notifications for booking approvals, rejections, and payment confirmations

### Hosts
- Register as a host or upgrade an existing student account to host
- Three-step identity and property verification flow (ID, documents, listing details)
- Verification status badge on dashboard — updates automatically every 30 seconds
- Add, edit, and delete property listings with images, amenities, utility costs, coordinates, and semester availability
- Approve or reject booking requests from the dashboard
- In-app messaging with students
- Email notifications for new booking requests and payment receipts

### Admins
- Full user management — view, role-change, delete
- Host verification queue — approve or reject with notes
- Property moderation queue
- Platform-wide booking and revenue statistics
- Activity log

### Email (Gmail SMTP)
All transactional emails are sent via Gmail SMTP using an app password. No external email service required.

| Trigger | Recipient |
|---|---|
| Account registration | Student or host — welcome email |
| Forgot password | User — reset link (expires 1 hour) |
| New booking request | Host |
| Booking approved | Student — with payment link |
| Booking rejected | Student — with search CTA |
| Payment confirmed | Student — booking confirmation |
| Payment received | Host |
| Verification approved | Host |
| Verification rejected | Host — with rejection reason |

---

## Tech Stack

### Frontend
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Lucide React (icons)
- Leaflet (map view)

### Backend
- Python 3.12 + Flask
- Flask-SQLAlchemy + Flask-Migrate
- Flask-JWT-Extended
- Flask-CORS
- PostgreSQL
- Google OAuth (google-auth)
- Safaricom Daraja M-Pesa Express
- Gmail SMTP (smtplib — built-in Python)
- Gunicorn

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL

---

## Project Structure

```
qrib/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── property.py
│   │   │   ├── booking.py
│   │   │   ├── payment.py
│   │   │   ├── message.py
│   │   │   ├── notification.py
│   │   │   ├── review.py
│   │   │   ├── university.py
│   │   │   └── host_verification.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── properties.py
│   │   │   ├── bookings.py
│   │   │   ├── payments.py
│   │   │   ├── messages.py
│   │   │   ├── notifications.py
│   │   │   ├── reviews.py
│   │   │   ├── host_verification.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   └── email.py
│   │   ├── extensions.py
│   │   └── __init__.py
│   ├── migrations/
│   ├── requirements.txt
│   └── run.py
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── PropertyCard.jsx
│   │   ├── MapView.jsx
│   │   ├── WalkingTime.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── AuthContextValue.jsx
│   │   ├── useAuth.jsx
│   │   └── ToastContext.jsx
│   ├── data/
│   │   └── universities.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── SearchResults.jsx
│   │   ├── AccommodationDetails.jsx
│   │   ├── BookingConfirmation.jsx
│   │   ├── PaymentPage.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── StudentProfile.jsx
│   │   ├── SavedHomes.jsx
│   │   ├── StudentMessages.jsx
│   │   ├── Messages.jsx
│   │   ├── NotificationsCenter.jsx
│   │   ├── HostInfo.jsx
│   │   ├── HostVerification.jsx
│   │   ├── HostDashboard.jsx
│   │   ├── AddProperty.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── PropertyReviews.jsx
│   │   └── Help.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── package.json
├── vite.config.js
├── render.yaml
└── README.md
```

---

## API Reference

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create student or host account |
| POST | `/login` | Email + password login |
| POST | `/google` | Google OAuth login or signup |
| GET | `/me` | Get current authenticated user |
| PATCH | `/upgrade-to-host` | Upgrade student account to host |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Verify token and set new password |
| POST | `/seed-admin` | Create admin account (secret required) |

### Properties — `/api/properties`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all properties |
| GET | `/<id>` | Get single property |
| GET | `/<id>/image` | Serve property image |
| POST | `/` | Create property (host only) |
| PATCH | `/<id>` | Update property (owner only) |
| DELETE | `/<id>` | Delete property (owner only) |

### Bookings — `/api/bookings`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List bookings for current user |
| GET | `/<id>` | Get single booking |
| POST | `/` | Create booking (student only) |
| PATCH | `/<id>` | Update booking status |
| PATCH | `/<id>/respond` | Host approve or reject booking |

### Payments — `/api/payments`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/initiate` | Initiate payment |
| POST | `/mpesa/stk-push` | M-Pesa STK Push |
| POST | `/mpesa/callback` | Daraja callback |
| GET | `/<id>` | Get payment status |

### Host Verification — `/api/host-verification`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Submit verification |
| GET | `/me` | Get own verification status |
| GET | `/host/<host_id>` | Get host verification (public) |

### Admin — `/api/admin`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | Platform statistics |
| GET | `/users` | List all users |
| GET | `/users/<id>` | User detail |
| PATCH | `/users/<id>/role` | Change user role |
| DELETE | `/users/<id>` | Delete user |
| GET | `/verifications/pending` | Pending verifications |
| PATCH | `/verifications/<id>/approve` | Approve verification |
| PATCH | `/verifications/<id>/reject` | Reject verification |
| GET | `/properties/moderation` | Unverified properties |
| PATCH | `/properties/<id>/verify` | Approve/reject property |
| DELETE | `/properties/<id>` | Delete property |
| GET | `/bookings` | All bookings |
| POST | `/run-migrations` | Run DB migrations (secret required) |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| PATCH | `/api/notifications/<id>/read` | Mark as read |
| GET | `/api/messages` | Conversation list |
| POST | `/api/messages` | Send message |
| GET | `/api/reviews/<property_id>` | Property reviews |
| POST | `/api/reviews` | Submit review |
| GET | `/api/universities` | List universities |

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL

### Frontend

```bash
git clone https://github.com/obapluto-ob/qrib.git
cd qrib
npm install
npm run dev
```

Runs on `http://localhost:5173`

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask db upgrade
python run.py
```

Runs on `http://localhost:5000`

---

## Environment Variables

### Frontend (`.env`)
```env
VITE_API_URL=https://qrib-f4sk.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_URL=https://qrib-mu.vercel.app
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_daraja_sandbox_passkey
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://qrib-f4sk.onrender.com/api/payments/mpesa/callback
ADMIN_SEED_SECRET=your_admin_seed_secret
```

### Setting up Gmail App Password
1. Enable 2-Step Verification on your Google account
2. Go to Google Account > Security > App Passwords
3. Generate a password for "Mail"
4. Use the 16-character password as `GMAIL_APP_PASSWORD`

---

## Deployment

- **Frontend**: Push to `main` — Vercel auto-deploys
- **Backend**: Push to `main` — Render auto-deploys, migrations run automatically on startup via `run.py`

---

## Author

Developed for the Moringa School full-stack development programme.
