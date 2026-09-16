# Kishan Seva — Full Project PRD

## 1. Project Overview

**Project:** Kishan Seva (किसान सेवा / কৃষাণ সেবা)  
**SIH Problem Statement:** SIH26032  
**Theme:** Smart Automation  
**Category:** Software  
**Organization:** Ministry of Consumer Affairs, Food & Public Distribution  
**Department:** Department of Consumer Affairs  
**Team:** BWU Null-Pointers

### Vision
Kishan Seva is a smart agricultural procurement, slot-booking, queue-management, procurement-tracking, and payment-status platform designed to reduce farmer waiting time, uncertainty, and congestion at procurement centres.

### Core Value
- Farmer registration and email OTP authentication
- Procurement-centre discovery and recommendation
- Slot booking and digital token
- Real-time queue management
- Procurement and payment tracking
- Operator workflow management
- Admin analytics and alerts
- ML-based waiting-time prediction
- Proactive congestion prediction
- English, Hindi, and Bengali support

---

# 2. Problem Statement

Farmers can face:
1. Long waiting times at procurement centres.
2. Lack of procurement schedule information.
3. Uncertainty about queue position and service time.
4. Difficulty selecting a suitable procurement centre.
5. Poor visibility into procurement progress.
6. Poor visibility into payment status.
7. Congestion caused by uncoordinated arrivals.
8. Limited operational analytics for centre staff.

Kishan Seva addresses these through advance scheduling, real-time queues, notifications, centre recommendation, operational dashboards, and predictive analytics.

---

# 3. Goals

## Primary
- Reduce unnecessary physical waiting.
- Improve centre capacity utilization.
- Provide transparent scheduling and queue information.
- Track procurement from check-in to completion.
- Provide payment-status visibility.
- Help farmers select suitable centres.
- Give operators actionable queue-management tools.
- Give administrators multi-centre visibility.
- Build a real dataset for ML waiting-time prediction.

## Non-Goals
- Replace official government procurement systems.
- Process real bank transactions without authorized integration.
- Store passwords or OTPs.
- Use raw Aadhaar/full bank data for ML.
- Present synthetic data as official/live data.
- Claim ML accuracy without measured evaluation.

---

# 4. Target Users

## Farmer
Needs simple registration, crop/land profile, centre discovery, slot booking, digital token, queue position, estimated wait, procurement status, payment status, notifications, and multilingual support.

## Operator
Needs live queue, current token, next farmers, estimated wait, capacity, quality checks, weighment, procurement completion, notifications, and exception handling.

## Administrator
Needs centre monitoring, procurement KPIs, queue/wait analytics, capacity utilization, overloaded-centre alerts, payment issue monitoring, audit logs, and ML monitoring.

---

# 5. Authentication Architecture

## Authentication Decision

**Clerk = authentication**  
**Supabase = application/user/profile data**

### Clerk handles
- Email authentication
- Email OTP
- Verification
- Session management
- Clerk user ID

### Supabase handles
- Application user record
- Roles
- Farmer/operator/admin profiles
- Bookings
- Slots
- Queue events
- Procurement
- Payments
- Notifications
- Analytics
- ML data

### Never store
- Passwords
- OTP codes
- Clerk session secrets

### Store
- Clerk user ID
- Normalized email
- Application role
- Account status
- Profile data
- Optional login audit timestamp

---

# 6. Authentication Flow

## Farmer Registration

```text
Registration
  ↓
Enter email
  ↓
Check duplicate email
  ↓
If exists:
"Email already exists. Please log in instead."
  ↓
Enter farmer details
  ↓
Create Clerk sign-up
  ↓
Send email OTP
  ↓
Verify OTP
  ↓
Finalize Clerk account
  ↓
Create Supabase user
  ↓
Create farmer profile
  ↓
Registration complete
  ↓
Dashboard
```

Only successful Clerk verification **and** Supabase profile creation can redirect to the dashboard.

## Farmer Login

```text
Enter email
  ↓
Check farmer application profile
  ↓
If missing:
"Farmer account not found. Please register first."
  ↓
Clerk email OTP
  ↓
Verify OTP
  ↓
Finalize session
  ↓
Load Supabase profile
  ↓
Dashboard
```

## Auth States

```text
AUTH_LOADING
SIGNED_OUT
REGISTERING
REGISTER_OTP_SENT
REGISTER_VERIFIED
PROFILE_CREATING
REGISTRATION_COMPLETE
REGISTRATION_FAILED

EMAIL_CHECKING
OTP_SENDING
OTP_SENT
OTP_VERIFYING
FINALIZING
PROFILE_LOADING
AUTHENTICATED

EMAIL_EXISTS
FARMER_NOT_FOUND
OTP_INVALID
OTP_EXPIRED
OTP_RATE_LIMITED
CLERK_ERROR
PROFILE_CREATE_FAILED
PROFILE_NOT_FOUND
DATABASE_ERROR
UNAUTHORIZED_ROLE
```

---

# 7. Role-Based Access Control

Roles:

```text
FARMER
OPERATOR
ADMIN
```

Role must come from the Supabase application user record.

Never infer role from email, localStorage, URL, or frontend-only state.

### Route model

```text
Public
├── Landing
├── Farmer Login
└── Farmer Registration

Private
├── Farmer Portal
├── Operator Portal
└── Admin Portal
```

Unknown authenticated users should receive a profile/authorization error instead of automatically becoming FARMER.

---

# 8. Farmer User Flow

```text
Landing
 ↓
Register
 ↓
Email OTP
 ↓
Farmer Profile
 ↓
Dashboard
 ↓
Select Crop
 ↓
Find Centre
 ↓
View Recommendation
 ↓
Select Date
 ↓
Select Slot
 ↓
Enter Quantity
 ↓
Confirm Booking
 ↓
Digital Token
 ↓
Check In
 ↓
Live Queue
 ↓
Quality Check
 ↓
Weighment
 ↓
Procurement Completed
 ↓
Payment Processing
 ↓
Payment Completed
```

---

# 9. Farmer Features

## Registration
Fields:
- Full name
- Email
- Phone
- State
- District
- Block
- Village
- Land information
- Crop information
- Optional coordinates

Phone is profile information, not an OTP authentication method.

## Dashboard
Show:
- Upcoming booking
- Crop
- Quantity
- Centre
- Date/time
- Queue position
- Estimated wait
- Procurement status
- Payment status
- Notifications

### Farmer navigation

```text
Home | Book | Queue | Payments | Profile
```

## Centre Discovery
Farmers can:
- Search/filter centres
- Filter by crop
- View capacity
- View queue length
- View estimated wait
- View distance
- View estimated travel time
- View operating status

## Explainable Centre Recommendation

```text
Active centres
 ↓
Crop compatible?
 ↓
Capacity available?
 ↓
Open?
 ↓
Distance / travel time
 ↓
Queue prediction
 ↓
Recommendation
```

Example:

```text
Why this centre?
✓ Crop accepted
✓ Capacity available
✓ 3.2 km away
✓ Lower predicted wait
✓ Open during selected slot
```

Incompatible centres must not be recommended.

---

# 10. Booking System

Booking fields:
- Farmer
- Crop
- Quantity
- Centre
- Date
- Slot

### Transaction-safe booking

Frontend checks are not enough.

```text
Booking request
 ↓
Lock/check slot
 ↓
Check remaining capacity
 ↓
Reserve quantity
 ↓
Create booking
 ↓
Commit
```

Example:

```text
Capacity = 100 quintals
Farmer A = 70
Farmer B = 70

A succeeds
B fails if remaining capacity < 70
```

### Booking lifecycle

```text
BOOKED
 ↓
CHECKED_IN
 ↓
WAITING
 ↓
QUALITY_TESTING
 ↓
WEIGHMENT
 ↓
PROCUREMENT_COMPLETED
 ↓
PAYMENT_PENDING
 ↓
PAYMENT_PROCESSING
 ↓
PAID
```

Exceptional states:
```text
CANCELLED
NO_SHOW
REJECTED
RESCHEDULED
PAYMENT_FAILED
```

---

# 11. Digital Token & Queue

Each booking gets:
- Booking ID
- Token
- Centre
- Date
- Slot
- Crop
- Quantity
- Status

## Queue View

Show:
- Current token
- Farmer token
- Position
- Farmers ahead
- Estimated wait
- Current processing stage
- Centre status

## Required timestamps

```text
queue_entered_at
quality_started_at
quality_completed_at
weighment_started_at
weighment_completed_at
procurement_started_at
procurement_completed_at
```

### Actual wait

```text
actual_wait_minutes =
service_started_at - queue_entered_at
```

### Actual service duration

```text
actual_service_minutes =
service_completed_at - service_started_at
```

These timestamps create the foundation for ML training.

---

# 12. Operator Portal

Operator portal is **action-oriented**.

## First viewport

```text
Current Token
Next Farmers
Queue Length
Estimated Wait
Capacity
Active Counters
Alerts
Primary Actions
```

## Functions
- Check in farmer
- Call next farmer
- Update queue
- Start/complete quality test
- Start/complete weighment
- Complete procurement
- Mark no-show
- Cancel/reschedule
- Manage capacity
- Block/unblock slots
- Notify farmers
- Handle exceptions

---

# 13. Admin Portal

Admin portal is **monitoring/analytics-oriented**.

## First viewport

```text
Total Procurement
Active Centres
Overloaded Centres
Average Wait
P90 Wait
Capacity Utilization
Payment Issues
Queue Trends
Alerts
```

## Functions
- Centre monitoring
- Procurement analytics
- Queue analytics
- Capacity analytics
- Payment monitoring
- Historical trends
- Centre performance
- Audit logs
- Model monitoring
- Data-quality monitoring

---

# 14. Notifications

Events:
- Booking confirmed
- Slot approaching
- Queue position changed
- Proceed to centre
- Delay detected
- Quality completed
- Weighment completed
- Procurement completed
- Payment initiated
- Payment completed
- Booking cancelled/rescheduled

Architecture:

```text
Business Event
 ↓
Notification Service
 ↓
In-app / Push / SMS
```

---

# 15. Procurement & Payment

## Procurement

Track:
- Booking
- Crop
- Quantity
- Quality result
- Weighment
- Accepted quantity
- Procurement status
- Operator
- Timestamp

## Payment lifecycle

```text
PAYMENT_PENDING
 ↓
PAYMENT_INITIATED
 ↓
PAYMENT_PROCESSING
 ↓
PAID
```

Failure:

```text
PAYMENT_FAILED
 ↓
Retry / Escalation
```

Track:
- Procurement ID
- Farmer ID
- Quantity
- Rate
- Gross amount
- Deductions if applicable
- Net amount
- Payment reference
- Payment date
- Status

---

# 16. ML System

## Objective

Predict **actual waiting time in minutes**.

### Target

```text
actual_wait_minutes
```

## Candidate Features

- Queue length
- Checked-in count
- Currently processing count
- Active counters
- Bookings next 30 minutes
- Bookings next 60 minutes
- Centre capacity
- Booked quantity
- Slot utilization
- Capacity utilization
- Hour
- Day
- Month
- Season
- Crop
- Quantity
- Historical average wait
- Historical median wait
- Historical service duration
- No-show rate
- Cancellation rate
- Distance
- Travel time
- Rainfall
- Temperature
- Market context where justified

## Model comparison

```text
Historical Median
 ↓
Linear Regression
 ↓
Random Forest
 ↓
Gradient Boosting / XGBoost
```

Do not assume Random Forest or XGBoost is the winner before evaluation.

## Metrics
- MAE
- RMSE
- R²

## Data split

Use chronological splitting:

```text
Older data → Training
Later data → Validation
Newest data → Test
```

Avoid future-data leakage.

---

# 17. ML Service

```text
ml-service/
├── training/
│   ├── build_dataset.py
│   ├── train_baseline.py
│   ├── train_random_forest.py
│   ├── evaluate.py
│   └── export_model.py
├── preprocessing/
├── models/
├── api/
│   └── routes.py
├── requirements.txt
└── main.py
```

Prediction endpoint:

```text
POST /api/v1/predict/waiting-time
```

Example:

```json
{
  "predicted_wait_minutes": 32,
  "confidence": 0.82,
  "model_version": "rf-v1",
  "fallback_used": false
}
```

If the model is unavailable or data is insufficient:

```text
ML unavailable
 ↓
Historical/rule-based fallback
 ↓
Return estimate
```

Booking must never fail because ML is unavailable.

---

# 18. ML Training Dataset

Recommended table:

```text
ml_wait_training_features
```

Fields:

```text
id
booking_id
centre_id
slot_id
event_date
hour
day
month
queue_length_at_arrival
active_counters
bookings_next_60m
checked_in_count
currently_processing
centre_capacity_quintals
booked_quantity_quintals
slot_utilization
avg_service_minutes_7d
avg_service_minutes_30d
avg_wait_minutes_7d
avg_wait_minutes_30d
no_show_rate_7d
cancellation_rate_7d
rainfall_mm
temperature_c
crop_id
crop_quantity_q
distance_km
travel_minutes
actual_wait_minutes
actual_service_minutes
data_quality_score
created_at
```

Do not use raw Aadhaar, OTPs, full bank details, or unnecessary PII in ML training.

---

# 19. ML Model Registry

Table:

```text
model_registry
```

Fields:

```text
model_name
model_type
version
trained_at
training_rows
feature_schema
metrics
artifact_path
status
```

Statuses:

```text
TRAINING
VALIDATION
ACTIVE
RETIRED
FAILED
```

## Prediction logging

Table:

```text
ml_predictions
```

Store:
- Booking
- Centre
- Prediction
- Timestamp
- Model version
- Feature/schema version
- Actual wait when available
- Prediction error

## Recommendation logging

Table:

```text
recommendation_outcomes
```

Store:
- Candidate centres
- Scores
- Selected centre
- Predicted wait
- Actual wait
- Distance
- Travel time
- Outcome

---

# 20. Proactive Congestion Prediction

Example:

```text
Current queue: 42
Expected arrivals: 31
Capacity: 60

Forecast:
HIGH CONGESTION
```

Possible actions:
- Open extra counter
- Increase slot capacity
- Redirect new bookings
- Extend operating hours
- Notify farmers

This makes the system proactive rather than only reactive.

---

# 21. Database Architecture

Core tables:

```text
users
farmer_profiles
operator_profiles
admin_profiles

procurement_centres
centre_daily_capacity
slots
bookings

queue_events
service_events

quality_checks
weighments
procurements
payments

notifications
audit_logs
centre_daily_metrics

ml_wait_training_features
ml_predictions
model_registry
recommendation_outcomes

crop_production
mandi_prices
weather
geo
holidays_calendar
msp_rates
```

---

# 22. Centre Data

Recommended fields:

```text
id
name
localized_name
latitude
longitude
district
block
address
accepted_crops
daily_capacity
operating_hours
active_status
data_source
source_url
is_demo
```

Use stable IDs/canonical values in the database.

Unverified static locations must not be labelled as official operational centres.

---

# 23. Data Provenance

For external datasets track:

```text
source
source_url
retrieved_at
license
coverage
granularity
version
checksum
```

Source types:

```text
OFFICIAL
LIVE
SYNTHETIC
DEMO
```

Synthetic data must never be presented as live government data.

---

# 24. Government/Public Data Usage

Useful contextual datasets:
- Paddy procurement
- MSP
- AGMARKNET/mandi prices
- District-wise crop production
- Weather
- Geographic/road data

Use public datasets as reference/context features.

Actual queue/service events should come from the application workflow or clearly labelled synthetic pilot data.

---

# 25. MSP Architecture

Create:

```text
msp_rates
```

Fields:

```text
crop
grade
season
marketing_year
rate
source
source_url
effective_from
effective_to
```

Do not hardcode changing government rates in frontend components.

---

# 26. Realtime Architecture

Realtime events:
- New booking
- Queue position change
- Token called
- Quality started/completed
- Weighment started/completed
- Procurement completed
- Capacity change
- Payment status change
- Notifications

MVP:

```text
Supabase Postgres Changes
```

Requirements:
- RLS
- Correct authorization
- Realtime publication configuration

For larger scale, evaluate Supabase Broadcast/private channels.

---

# 27. Security

## Authentication
- Clerk email OTP.
- No passwords.
- No phone OTP.

## Authorization
- Database-driven roles.
- Server-side validation for sensitive operations.
- RLS/least privilege.

## Secrets
Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
Clerk secret keys
private API keys
```

in frontend code.

## Privacy
Avoid unnecessary PII. Never use raw sensitive identity/bank information for ML training.

---

# 28. PWA / Offline

Can support:
- Cached app shell
- Recent booking display
- Recent token display
- Profile display
- Safe retry of non-critical UI operations

Critical actions such as booking and procurement updates require confirmed server/database success.

---

# 29. Localization

Supported:

```text
English
Hindi
Bengali
```

Important terms:

| English | Hindi | Bengali |
|---|---|---|
| Paddy | धान | ধান |
| Wheat | गेहूं | গম |
| Mustard | सरसों | সরিষা |
| Barasat | बारासात | বারাসাত |
| Basirhat | बशीरहाट | বসিরহাট |
| North 24 Parganas | उत्तर 24 परगना | উত্তর ২৪ পরগনা |
| West Bengal | पश्चिम बंगाल | পশ্চিমবঙ্গ |
| Kolkata | कोलकाता | কলকাতা |
| Bongaon | बनगाँव | বনগাঁ |

Use explicit localization dictionaries instead of blindly translating critical government/location terms.

---

# 30. UI/UX

## Design principles
- Farmer: mobile-first and simple.
- Operator: action-oriented.
- Admin: monitoring-oriented.
- Clear hierarchy.
- Large touch targets.
- Strong loading/error/empty states.
- Minimal unnecessary animation.

## Touch targets
Primary interactive elements should be approximately 44px or larger.

## Motion
```text
Micro: 150–200ms
Normal: 250–350ms
Major: 400–600ms
```

Use transform/opacity and respect reduced-motion preferences.

## Responsive testing

```text
320
360
375
390
430
768
1024
1280
1440
1920
```

---

# 31. Farmer Map UX

Mobile flow:

```text
Map
 ↓
Centre list
 ↓
Bottom sheet
 ↓
Centre details
 ↓
Book
```

Location sources:
1. Browser geolocation when permission is available.
2. Saved farmer coordinates.
3. Manual fallback.

Do not hardcode one farmer location.

---

# 32. Audit Trail

Every important operator/admin action should record:

```text
actor_id
actor_role
action
entity_type
entity_id
old_value
new_value
reason
timestamp
metadata
```

Examples:
- Slot capacity changed
- Booking cancelled
- Farmer rescheduled
- Queue updated
- Procurement completed
- Payment updated

---

# 33. Error Handling

Use clear messages:

```text
Network unavailable. Please try again.

Slot is no longer available.

Centre capacity is full.

Farmer account not found. Please register first.

Email already exists. Please log in instead.

OTP is incorrect.

OTP has expired. Please request a new code.

Farmer profile could not be loaded.

Booking could not be completed. No capacity was reserved.
```

Never silently fall back to mock data in production.

---

# 34. Loading / Empty States

Every major screen should handle:

```text
Loading
Success
Empty
Error
Retry
Unauthorized
Offline
```

Examples:

```text
No upcoming bookings.
No centres available for this crop.
No payment records yet.
No active queue.
Unable to load queue. Retry.
```

---

# 35. Technology Stack

## Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Zod
- Recharts
- Leaflet
- React Leaflet
- Framer Motion
- Sonner
- PWA support
- idb-keyval

## Authentication
- Clerk
- `@clerk/react`
- Email OTP

## Backend/Data
- Supabase
- PostgreSQL
- Supabase Realtime
- Supabase Edge Functions/server-side APIs where appropriate

## ML
- Python
- FastAPI
- Pandas
- NumPy
- Scikit-learn
- Joblib
- XGBoost if justified by evaluation

## Deployment
- Vercel for frontend
- Supabase for database/backend
- Separate ML-service deployment as required

## Maps
- Leaflet
- React Leaflet
- Routing provider when available
- Haversine fallback when routing is unavailable

---

# 36. Project Structure

```text
kishan-seva/
│
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── farmer/
│   │   ├── operator/
│   │   └── admin/
│   ├── layouts/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── lib/
│   ├── i18n/
│   ├── types/
│   └── utils/
│
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── functions/
│
├── ml-service/
│   ├── training/
│   ├── preprocessing/
│   ├── models/
│   ├── api/
│   └── main.py
│
├── public/
├── .env.example
├── package.json
└── README.md
```

---

# 37. Environment Variables

```env
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_DEMO_MODE=false

ML_SERVICE_URL=
```

Never put secret server keys in `VITE_*` variables.

---

# 38. Demo / Production Modes

## Production

```env
VITE_ENABLE_DEMO_MODE=false
```

Uses real Clerk authentication, real Supabase data, and database-driven authorization.

## Demo

```env
VITE_ENABLE_DEMO_MODE=true
```

May use synthetic farmers, queue events, demo centres, and demonstration predictions.

Demo data must be visibly distinguishable from live/official data.

---

# 39. Testing

## Unit
Test:
- Booking validation
- Capacity calculation
- Queue calculation
- Recommendation filtering
- Localization
- Role guards
- Payment calculations
- ML preprocessing

## Integration

```text
Registration → Clerk → Supabase profile
Login → Clerk OTP → Supabase profile
Booking → Capacity → Database
Booking → Queue
Queue → Procurement
Procurement → Payment
```

## Security
Test:
- Farmer cannot access operator routes.
- Operator cannot access admin functions.
- Unauthenticated users cannot access private routes.
- Farmer cannot access another farmer's booking.
- Service role key is never exposed.

## Responsive
Test all defined viewport sizes.

---

# 40. Success Metrics

## Product
- Average waiting time
- Median waiting time
- P90/P95 waiting time
- Average service duration
- Slot utilization
- Capacity utilization
- No-show rate
- Cancellation rate
- Farmer arrival deviation
- Procurement completion rate
- Payment completion time

## ML
- MAE
- RMSE
- R²
- Prediction coverage
- Fallback rate

---

# 41. Dashboard KPIs

## Farmer

```text
Upcoming Booking
Queue Position
Estimated Wait
Procurement Status
Payment Status
```

## Operator

```text
Current Token
Queue Length
Estimated Wait
Today's Farmers
Today's Quantity
Capacity Utilization
Active Counters
No-Shows
```

## Admin

```text
Total Centres
Active Centres
Total Procurement
Average Wait
P90 Wait
Overloaded Centres
Capacity Utilization
Payment Issues
Daily/Weekly Trends
```

---

# 42. Recommended Architecture

```text
                    FARMER
                      │
                Mobile Web/PWA
                      │
                      ▼
                   CLERK
              Email OTP + Auth
                      │
                      ▼
                 FRONTEND
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       FARMER      OPERATOR      ADMIN
       PORTAL       PORTAL       PORTAL
          └───────────┼───────────┘
                      ▼
                  SUPABASE
          PostgreSQL + RLS + Realtime
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
     QUEUE       PROCUREMENT      PAYMENTS
       │
       ▼
   ML SERVICE
    FastAPI
       │
       ▼
Wait Prediction / Recommendation /
Congestion Prediction
```

---

# 43. Complete Operator Flow

```text
Operator Login
 ↓
Clerk Email OTP
 ↓
Supabase Role Check
 ↓
Operator Dashboard
 ↓
View Capacity
 ↓
View Live Queue
 ↓
Call Next Farmer
 ↓
Check-in
 ↓
Quality Test
 ↓
Weighment
 ↓
Procurement
 ↓
Payment Status
 ↓
Notify Farmer
 ↓
Next Farmer
```

---

# 44. Complete Admin Flow

```text
Admin Login
 ↓
Clerk Email OTP
 ↓
Supabase Role Check
 ↓
Admin Dashboard
 ↓
Centre Health
 ↓
Queue Analytics
 ↓
Capacity Analytics
 ↓
Procurement Analytics
 ↓
Payment Issues
 ↓
Congestion Forecast
 ↓
Alerts
 ↓
Audit Logs
 ↓
Model Monitoring
```

---

# 45. SIH Demo Scenario

1. Farmer registers with email.
2. Clerk sends OTP.
3. Farmer verifies OTP.
4. Supabase creates farmer profile.
5. Farmer selects Paddy.
6. Compatible centres are discovered.
7. Recommendation explains why a centre is selected.
8. Farmer chooses slot.
9. Database reserves capacity transactionally.
10. Digital token is generated.
11. Operator sees the farmer in the live queue.
12. Queue position updates in real time.
13. ML service predicts waiting time.
14. Operator performs quality check.
15. Operator performs weighment.
16. Procurement is completed.
17. Farmer sees procurement status.
18. Payment status updates.
19. Admin dashboard updates KPIs.
20. Congestion prediction demonstrates proactive management.

---

# 46. Hackathon Differentiators

1. Registration-first email OTP authentication.
2. Real-time digital queue.
3. Transaction-safe slot capacity.
4. Explainable centre recommendation.
5. ML waiting-time prediction.
6. Proactive congestion prediction.
7. Procurement-to-payment tracking.
8. Role-specific farmer/operator/admin portals.
9. Multilingual support.
10. Auditability.
11. Data provenance.
12. Hybrid ML + fallback architecture.
13. Mobile-first farmer experience.
14. Government-data-informed analytics.

---

# 47. Implementation Priority

## Critical
- Clerk OTP + Supabase profile architecture
- Remove fake authentication
- Remove fake farmer UUID
- Remove silent mock fallback in production
- Transaction-safe booking
- Database-driven role authorization
- Queue event timestamps
- RLS/security

## High
- ML waiting-time pipeline
- Correct centre recommendation
- Realtime queue
- Procurement/payment lifecycle
- Notifications
- Audit logs

## Medium
- MSP/data-source management
- Full Bengali/Hindi localization
- Explainable recommendations
- Historical centre metrics

## Demo Booster
- Congestion prediction
- Proactive operator actions
- ML model monitoring

---

# 48. Definition of Done

- [ ] Clerk email OTP registration works.
- [ ] Clerk email OTP login works.
- [ ] Registration-first requirement is enforced.
- [ ] Duplicate registration shows the required message.
- [ ] Unregistered login shows the required message.
- [ ] Supabase profile creation works.
- [ ] Roles are database-driven.
- [ ] Demo auth is disabled in production.
- [ ] No fake farmer UUID exists.
- [ ] No silent mock fallback exists in production.
- [ ] Slot capacity is transaction-safe.
- [ ] Queue events have timestamps.
- [ ] Actual wait can be calculated.
- [ ] Recommendation filters incompatible centres.
- [ ] Realtime updates work.
- [ ] RLS/authorization is configured.
- [ ] ML dataset can be generated.
- [ ] ML model can be trained/evaluated.
- [ ] Predictions are logged.
- [ ] Fallback prediction works.
- [ ] Procurement lifecycle works.
- [ ] Payment lifecycle works.
- [ ] Notifications work.
- [ ] Audit logging works.
- [ ] English/Hindi/Bengali core flows work.
- [ ] Mobile layouts are tested.
- [ ] Data provenance is visible.
- [ ] Sensitive PII is excluded from ML training.
- [ ] Production secrets are protected.

---

# 49. Product Principle

Kishan Seva should be presented as a complete smart procurement-centre management platform:

```text
AUTHENTICATED FARMER
        +
SMART SCHEDULING
        +
REAL-TIME QUEUE
        +
PROCUREMENT WORKFLOW
        +
PAYMENT TRANSPARENCY
        +
CENTRE RECOMMENDATION
        +
WAIT-TIME ML
        +
CONGESTION PREDICTION
        +
OPERATIONAL ANALYTICS
        +
AUDITABILITY
```

The goal is not only to book a slot, but to make procurement more predictable, transparent, data-driven, and operationally efficient.
