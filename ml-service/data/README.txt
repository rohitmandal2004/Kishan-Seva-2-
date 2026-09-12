KISHAN SEVA DATASET PACK

Synthetic files are for development/demo/model prototyping only.
Do not use them as real government/farmer records.
Never store real Aadhaar, bank-account numbers, OTPs or other sensitive personal data here.

CORE:
- procurement_centres.csv
- procurement_slots.csv
- farmers_synthetic.csv
- bookings_synthetic.csv
- queue_events_training.csv
- procurement_transactions_synthetic.csv
- payments_synthetic.csv
- quality_checks_synthetic.csv
- msp_paddy.csv
- crop_production_template.csv
- mandi_prices_template.csv
- weather_template.csv
- centre_performance_features.csv
- notifications_synthetic.csv
- centre_operating_calendar_template.csv

ML TARGETS:
Waiting-time prediction -> observed_wait_time_min
Demand forecasting -> bookings/farmer count by centre/day
Centre recommendation -> centre utility/ranking
No-show prediction -> add a no_show label after collecting enough real history.

For production, queue/booking/procurement/payment data should come from authorized application/database integrations.
