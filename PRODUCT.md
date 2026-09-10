# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
1. **Farmer**: Mobile-first experience. Must remain simple, trustworthy, and accessible for users with varying levels of digital literacy.
2. **Procurement Centre Operator**: Desktop/tablet oriented. Manages today's farmer arrivals, tokens, live queue, bookings, procurement processing, quality checks, weighments, completed farmers, no-shows, cancellations, and operational alerts.
3. **Administrator**: Desktop-first. Monitors procurement centres, centre performance, queue performance, farmer activity, bookings, procurement, payments, operational trends, alerts, system health, and reports.

## Product Purpose
Kishan Seva is a Smart India Hackathon 2026 farmer procurement platform. It digitizes the crop procurement process, eliminating manual queueing at Mandis by offering scheduled slots, live digital queues, and transparent payment tracking.

## Positioning
An official State/Central Government portal that bridges the gap between traditional farming operations and digital efficiency. 

## Operating Context
- **Operator focus:** What needs attention now, waiting farmers, next tokens, centre load, required operational actions.
- **Administrator focus:** Overall health, overloaded centres, wait-time trends, procurement performance, payment issues, actionable alerts.

## Capabilities and Constraints
- Preserve existing Kishan Seva architecture, functionality, routing, Supabase integration, and role structure.
- Do not replace working functionality with mock data.
- Do not redesign the farmer experience unless it is necessary for shared design-system consistency.
- Accessibility, responsive behavior, keyboard usability, and performance must be preserved.

## Brand Commitments
The visual language must be: trustworthy, modern, calm, operational, highly legible, premium but not flashy, distinctive, and appropriate for an Indian agriculture/procurement platform. 
**Avoid**: generic dashboard cards everywhere, excessive gradients, excessive glassmorphism, excessive rounded cards, huge decorative charts, unnecessary animations, excessive shadows, meaningless badges, visual clutter, "AI-looking" decoration without purpose. The admin and operator dashboards should feel like a polished modern government operations platform, not a generic SaaS template.

## Evidence on Hand
Working functionality currently relies on existing Supabase integration and established role structures.

## Product Principles
1. **"Don't make the farmer understand the software. Make the software understand the farmer."**
2. **Accessibility First**: Information must be legible outdoors and understandable via audio for varying literacy levels.
3. **Physical Sync**: The digital state (Live Queue, Booked Slot) must perfectly mirror the physical reality at the procurement centre.
4. **Absolute Transparency**: MSP rates and payment statuses must be unambiguous and immediate.
