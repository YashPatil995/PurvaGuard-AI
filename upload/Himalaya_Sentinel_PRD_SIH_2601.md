# PRD — PURVAGUARD AI
## AI-powered early warning, landslide risk monitoring, and community disaster response platform
**Version:** 1.0 | **Prepared for:** Smart India Hackathon 2026 | **Problem Statement:** 2601  
**Sponsor/department shown in brief:** Ministry of Development of North Eastern Region (MDoNER)  
**Product type:** Full-stack, geospatial disaster intelligence and response web platform  
**Primary pilot geography:** Northern Himalayan belt, with an initial focus on the North Eastern Region (NER) and adjoining Himalayan districts

> **Product principle:** This is a decision-support and community preparedness platform—not an official warning authority. Predictions, routes, and alerts must show source, timestamp, confidence, limitations, and the responsible authority. Never claim that a model, route, or message is “guaranteed safe.”

---

# 1. Executive summary

PurvaGuard AI is a responsive, multilingual disaster-intelligence platform that combines an interactive live map, AI-assisted landslide/flash-flood risk estimation, official alert ingestion, local weather and terrain data, community SOS, evacuation support, volunteer coordination, and a powerful operations dashboard.

The core USP is **“From risk signal to last-mile action”**: fuse environmental indicators and local reports into explainable risk layers; translate the resulting guidance into local languages; deliver it to people in affected geofenced areas; and support verified responders with incident context, last-known location, and route options.

The product must remain useful during weak or absent connectivity. The website should cache critical local guidance, last-synced alerts, selected maps, emergency contacts, and a compact offline AI assistant. When connectivity returns, it should sync queued reports and status updates safely.

## 1.1 Product outcomes
1. Help residents understand current hazards and practical actions for their selected location.
2. Surface emerging landslide/flash-flood risk earlier than a purely reactive report feed, while clearly communicating uncertainty.
3. Give district-level operators one place to review alerts, validate community reports, publish advisories, and coordinate response.
4. Enable SOS reporting with consent-based location sharing and clear escalation status.
5. Make safety information accessible in English and relevant local languages.
6. Demonstrate a credible, working hackathon MVP with realistic seeded data and transparent “demo/simulated” labels wherever live integrations are not configured.

## 1.2 Non-goals
- Replacing NDMA, SDMA, IMD, GSI, police, district administrations, or official emergency services.
- Automatically dispatching emergency services without a real, authorized integration and human/authority workflow.
- Guaranteeing prediction accuracy, rescue arrival times, or route safety.
- Publishing unverified crowdsourced claims as confirmed facts.
- Treating generated AI text as an official warning.
- Claiming live satellite, sensor, weather, or emergency-dispatch feeds when only sample data is present.

---

# 2. User groups and roles

## 2.1 Public resident / visitor
Needs location-specific risk, understandable instructions, SOS, safe shelter information, offline access, and a low-friction interface.

## 2.2 Vulnerable resident / caregiver
Needs large controls, audio/read-aloud guidance, low-bandwidth mode, trusted contacts, household check-ins, and accessible language.

## 2.3 District disaster-management operator
Needs a district overview, incoming incidents, alert drafting/approval, affected-area targeting, resource visibility, and audit trails.

## 2.4 State/region operations operator
Needs cross-district situational awareness, trend charts, resource gaps, alert escalation, and inter-district coordination.

## 2.5 NGO / registered volunteer
Needs verified onboarding, availability, skill/vehicle/equipment profile, task assignment, safe check-in/out, and clear limits on what volunteers may do.

## 2.6 Field responder
Needs incident coordinates, last-known location with timestamp, caller-provided details, access constraints, assigned task, route alternatives, and status updates.

## 2.7 Platform super-admin
Manages users, roles, districts, hazard zones, data sources, language strings, model versions, integrations, content, media, audit logs, and platform settings.

## 2.8 Data / AI analyst
Reviews model inputs, quality, calibration, false alarms/missed events, source freshness, model versions, and drift. Cannot publish official alerts unless separately granted permission.

---

# 3. Product architecture and navigation

## 3.1 Public website navigation
- **Home**
- **Live Map**
- **Risk & Forecast**
- **Alerts**
- **SOS / Get Help**
- **Safe Places & Routes**
- **Community Reports**
- **Volunteer / NGO**
- **Preparedness Library**
- **News & Updates**
- **About / Data Sources**
- **Language selector**
- **Accessibility / Low-bandwidth toggle**
- **Sign in / Profile**

Persistent header: brand, current selected location, language, connectivity/sync indicator, and prominent **SOS** action. On mobile, use a bottom navigation with Home, Map, SOS, Alerts, Profile.

## 3.2 Protected workspaces
- **District Operations Dashboard**
- **State / Regional Dashboard**
- **Volunteer / NGO Workspace**
- **Field Responder Workspace**
- **Platform Admin Console**
- **AI & Data Quality Console**

Role-based access must be enforced on the server/API, not merely by hiding UI elements.

---

# 4. Information architecture and screen specifications

## 4.1 Home screen
The home screen is a calm, action-oriented command surface—not a wall of widgets.

### Above the fold
1. Current selected location and “last updated” time.
2. **Risk summary card:** landslide, flash flood, heavy rain, road blockage, earthquake (where data exists); level, trend, confidence, source freshness.
3. **Primary actions:** “Check my area”, “SOS / Get Help”, “Find a safe place”, “Report a hazard”.
4. **Live alert ticker:** only active and verified/official alerts; distinguish official, operator-verified, and community-reported items.
5. **Latest news window:** compact scrolling cards, timestamp, source, region tags, and “open source” link. Auto-refresh only when online; never present stale headlines as current.
6. Connectivity badge: Online / Weak connection / Offline; show last sync time.

### Main content sections
- Interactive map preview with alert clusters and “Open full map”.
- “Risk in the next 1/3/6/24 hours” visualization when supported by valid forecast data.
- Local weather panel: rainfall, temperature, humidity, wind, forecast period, source and timestamp.
- “What should I do now?” personalized checklist, generated from vetted templates and relevant risk/location.
- Nearby shelters, hospitals, relief points, road closures, and verified help desks.
- Recent verified community reports.
- Preparedness tip of the day.
- District status snapshot and key public advisories.
- Recent earthquakes / significant events module, with source/time and explicit “reported event” labeling.
- Footer with data sources, emergency-number disclaimer, privacy, accessibility, terms, and feedback.

### Home behavior
- Default location may be selected manually; browser geolocation requires explicit permission.
- If geolocation is denied, do not block use; provide district/town search.
- Location selection persists only with user consent.
- News ticker pauses on hover/focus and respects reduced-motion settings.
- No flashing/strobing animation. Alert audio is opt-in and user-controlled.

## 4.2 Live map
A full-screen map is a core feature, with a collapsible left layer panel, right-side incident/alert drawer, and bottom time slider.

### Map layers
- Administrative boundaries: state, district, block, village where available.
- Terrain/elevation and slope.
- Landslide susceptibility zones (static baseline, clearly labeled).
- Dynamic landslide risk estimate (only when model inputs are available).
- Rainfall: observed and forecast, with accumulation window and source.
- River/stream network and flood-prone zones.
- Reported landslides, flash floods, roadblocks, cracks, subsidence, fallen trees.
- Official warnings and alert polygons.
- Roads, bridges, tunnels, known closures.
- Shelters, hospitals, fire/police stations, relief centers.
- Volunteer/response unit locations (only if authorized and privacy-safe).
- Sensor stations / weather stations, with data freshness.
- Satellite imagery layer only when a licensed and functioning provider is configured.
- Historical incidents / event playback.

### Map controls
- Search by place, district, landmark, or coordinates.
- “Use my location” with permission and clear indicator.
- Layer toggles, legend, opacity, date/time selector, zoom, reset extent, fullscreen.
- Draw/select area for district operators; public users can select a saved home area.
- Click marker/polygon to open details: event type, severity, source, time, confidence, verification status, affected locality, recommended action, linked bulletin.
- Cluster markers at wide zoom levels.
- Color palette must not rely on color alone; include icons and text labels.
- “Data unavailable” and “stale data” states must be visible.

### Map performance
- Load base map quickly; lazy-load heavy overlays.
- Use vector tiles or server-side aggregation for dense points.
- Public users see approximate volunteer presence, not exact personal positions.
- Never expose exact SOS caller coordinates to public map viewers.

## 4.3 Risk & Forecast page
- Risk overview by hazard and time horizon.
- District ranking is allowed as factual sorting by current model output, but avoid “safest district” claims; provide context and uncertainty.
- Time-series rainfall, soil moisture (if available), slope/terrain indicators, river level (if available), incident counts, and alert history.
- Risk map with district and locality drill-down.
- Model explanation: top contributing signals, data coverage, confidence, known limitations, model version.
- Compare current signals to historical baseline when baseline exists.
- Forecast horizon clearly stated; do not extrapolate beyond model validation.
- “Why is this area flagged?” explanation card.
- Downloadable/printable district brief for authorized users.
- “No reliable estimate” state if required data are missing or stale.

## 4.4 Alerts page
Filters: hazard, state/district, severity, source type, verification status, active/expired, date.
Each alert card contains:
- Title and hazard type.
- Issuer/source and source link.
- Issue time, valid-from, expiry time, last checked.
- Geographic scope/map.
- Severity and confidence (separate fields).
- Plain-language impact and recommended actions.
- Language versions.
- Verification badge: Official / District verified / Community report / Demo.
- Share, print, save, and accessibility read-aloud controls.
Expired alerts remain available in history but are visually distinct.

## 4.5 SOS / Get Help flow
A high-visibility, carefully guarded flow with a **Save my last location** setting and an emergency action.

### Before an emergency
- User may opt in to save last known location locally and/or to their account.
- Explain precisely what is saved, when it updates, who can see it, and how to delete it.
- “Emergency contacts” management: name, relationship, phone, consent/verification state.
- Optional household group with invitation and consent.
- Offline emergency card: name (optional), essential needs (optional), emergency contacts, last-synced local instructions.

### SOS initiation
1. User presses SOS.
2. Confirmation sheet explains what will be shared; allow “Send SOS now” and “Cancel”.
3. Capture GPS if permission is granted; otherwise use saved last-known location with its timestamp and accuracy, and allow manual location.
4. Collect optional emergency type: trapped, injured, flood, landslide, road blocked, missing person, other.
5. Optional short text, number of people, urgent medical/accessibility needs, photo/audio only if connection permits and consent is explicit.
6. Submit to backend; assign unique incident ID.
7. Show clear delivery state: Queued offline / Sent to platform / Acknowledged by operator / Assigned / Closed. Do not imply emergency services received it unless confirmed by integration or operator.
8. Provide instructions to contact local official emergency services directly when possible. Show region-configured official contacts only after validation by administrators.

### “Save my last location” behavior
- Explicit opt-in, off by default.
- Store last GPS fix, timestamp, accuracy, and consent state.
- Prefer device-local storage for public web MVP; if account sync is offered, encrypt in transit and restrict access.
- Location expires after a configurable retention period (default 24 hours for emergency-only last-known location unless user chooses otherwise).
- In SOS, label “last known” prominently; never represent it as live tracking.
- Live tracking starts only after explicit consent and stops automatically after a configurable duration or when user ends it.
- User can revoke sharing and delete saved location.

### Emergency notification routing
- Route to the platform incident queue and the configured district authority/response desk only where an authorized integration or verified recipient is established.
- MVP demo: create a visible simulated delivery record and an admin alert; mark it **SIMULATED—NOT SENT TO GOVERNMENT OR EMERGENCY SERVICES**.
- Real SMS/WhatsApp/email/push integrations require approved provider credentials, recipient validation, rate limiting, consent, delivery receipts, and legal/security review.
- Do not hard-code personal phone numbers or invent official recipients.

## 4.6 Safe places and route assistance
- Show verified shelters, hospitals, relief centers, public facilities, and designated assembly points.
- Route options from current or manually selected location to a destination.
- Route profile: walking / vehicle / accessible (only if routing data supports it).
- Overlay known road closures, verified hazard polygons, bridge/tunnel constraints, and active warnings.
- Show route source, last update, distance, estimated travel time only if supported, and warnings.
- Offer alternatives and allow “share route with trusted contact”.
- Route computation must avoid known closures and hazard polygons when data are available.
- Display **“Route is an aid, not a guarantee of safety. Follow local authorities and on-ground responders.”**
- If route data are missing or stale, do not draw a falsely precise “safe route”; show destination/contact information and direct users to official guidance.
- Rescue teams may submit route blockage/condition reports with time, location, source, and verification state.

## 4.7 Community hazard reports
Report categories: landslide, crack/ground movement, flood/water rise, road blocked, bridge damage, fallen tree, building damage, missing person, fire, other.
- Capture location only with permission; allow manual pin.
- Add description, severity self-assessment, optional photo/audio, time observed.
- Show privacy warning before uploading faces, vehicle plates, or identifiable people.
- Queue offline submissions and sync when online.
- Duplicate detection by location/time/category.
- Status: received, under review, verified, rejected, resolved.
- Public map displays only moderated/appropriately generalized reports.
- Reporters can track their own report and withdraw it where feasible.
- No public comments on active emergency reports in MVP; prevent rumor amplification.

## 4.8 Volunteer / NGO registration and workspace
### Registration
- Individual or organization profile.
- Legal name/organization name, service area, contact, languages, skills, availability, training/certification (optional), vehicle/equipment, accessibility capability.
- Identity/organization verification workflow; document uploads access-restricted.
- Code of conduct, privacy consent, safety disclaimer, emergency boundaries.
- Admin approval before operational assignment.
- Public profile reveals only approved organization-level contact information.

### Volunteer workspace
- Availability toggle and service radius.
- Task board: requested support, supply distribution, welfare checks, translation, shelter support, transport (authorized only), mapping/report verification.
- Task detail: area, risk briefing, coordinator, required skills, safe check-in/out, status.
- Volunteer check-in/out and optional location sharing only during an assigned task, with consent.
- No assignment into a restricted/high-risk zone without authorized coordinator approval.
- “I am unsafe / need assistance” escalation.
- NGO dashboard: roster, skills, availability, task status, supplies, completed tasks, incident notes.
- Volunteer performance is operational history, not a public rating leaderboard.

## 4.9 Preparedness library
- Hazard-specific “before / during / after” checklists.
- Household emergency kit, family communication plan, document checklist.
- Landslide signs: new ground cracks, tilting trees/poles, unusual water seepage, rumbling, sudden stream changes—always pair with “move away and follow official instructions”.
- Flash flood guidance: avoid crossing flowing water; move to higher ground when advised.
- Earthquake guidance, cold-wave/heavy-rain guidance, road travel guidance.
- Downloadable low-size guides, audio playback, local-language translations.
- Content must be reviewed by a qualified disaster-management editor and versioned.
- Include source, review date, and next review date.

## 4.10 News & updates
- News panel on home plus full feed page.
- Ingest only from configured trusted sources/RSS/API or admin-authored posts.
- Display headline, publisher, publish time, fetch time, affected region, category, original link.
- Admin can pin, unpin, correct, archive, and mark “official bulletin”.
- Never scrape or republish copyrighted full articles; display concise headline/summary and link to publisher.
- AI-generated summaries require clear “AI summary” label and source link.
- Stale-feed warning and source health status.
- No fabricated “live news” in demo: seed sample articles labeled DEMO with fictional/sample content or use verified links.

---

# 5. Geographic pilot and sample localities

The product must support district-level configuration rather than hard-coding only these examples. Use canonical administrative names, state, district, block/locality, coordinates, boundary source, and local-language display names. The following are **initial demo coverage candidates**, not a claim that every locality is currently monitored by live sensors.

| State / region | Demo locality candidates | Local-language display |
|---|---|---|
| Sikkim | Gangtok; Mangan; Chungthang | गान्तोक (Nepali); मङ्गन; चुंगथाङ |
| Arunachal Pradesh | Itanagar; Tawang; Bomdila; Ziro | ईटानगर; तवांग; बोमडिला; जीरो |
| Assam (foothills / river corridors) | Guwahati; Dibrugarh; Silchar; Haflong | গুৱাহাটী; ডিব্ৰুগড়; শিলচৰ; হাফলং |
| Meghalaya | Shillong; Cherrapunji / Sohra; Tura | Shillong; Sohra (local Khasi name); Tura |
| Nagaland | Kohima; Dimapur | Kohima; Dimapur |
| Manipur | Imphal; Churachandpur | Imphal; Churachandpur |
| Uttarakhand | Joshimath; Chamoli; Rudraprayag; Pithoragarh | जोशीमठ; चमोली; रुद्रप्रयाग; पिथौरागढ़ |
| Himachal Pradesh | Mandi; Kullu; Manali; Shimla | मंडी; कुल्लू; मनाली; शिमला |
| Jammu & Kashmir | Srinagar; Anantnag; Ramban | श्रीनगर; अनंतनाग; रामबन |
| Ladakh | Leh; Kargil | लेह; कारगिल |

### Geographic data rules
- Store canonical English names and verified local-script names separately.
- Language labels must be checked by native speakers; do not infer language solely from state.
- Use a language per locality/district configuration, with fallback order: chosen user language → district default → English.
- The UI should support Nepali, Hindi, Assamese, Bengali, Khasi, Garo, Mizo, Manipuri/Meitei, Bodo, Nyishi and other languages only when vetted translations are available. Include a language picker and “translation reviewed” metadata.
- For the hackathon demo, prioritize English + Hindi + Nepali + Assamese; add further reviewed language packs as time allows.
- Nepal-adjacent geography is relevant for cross-border context, but the MVP must not imply authority over Nepal’s emergency services. Cross-border alerts should link to the issuing authority and be labeled by jurisdiction.

---

# 6. AI early-warning USP and model design

## 6.1 USP statement
**“A multilingual, offline-capable, explainable last-mile warning system that connects environmental risk signals to geofenced community action and coordinated response.”**

## 6.2 AI functions
1. **Landslide risk estimation:** classify risk by locality/grid and forecast horizon using available rainfall intensity/accumulation, antecedent rainfall, slope, elevation, soil/geology proxies, land cover, drainage, and validated incident history.
2. **Flash-flood risk estimation:** use rainfall, river gauge/water level where available, terrain, catchment characteristics, and official flood warnings.
3. **Anomaly detection:** flag unusual rainfall/sensor changes or sudden report clusters.
4. **Report triage:** classify incoming reports, detect duplicates, extract location clues, and prioritize human review.
5. **Impact summarization:** produce short district briefs from structured records and verified bulletins.
6. **Local-language preparedness assistant:** answer from an approved retrieval corpus, cite the relevant guidance title/source/date, and fall back safely when uncertain.
7. **Geofenced notification targeting:** determine which subscribed areas intersect an authorized alert polygon; it is rules-based geospatial logic, not an LLM decision.
8. **Explainability:** show the signals that contributed to a risk estimate and their freshness.

## 6.3 Prediction pipeline
1. Ingest data with source, units, timestamp, geographic resolution, license, and quality flags.
2. Validate schema, units, outliers, missingness, and timestamp freshness.
3. Align data spatially to a district/locality/grid and temporally to the model horizon.
4. Generate features (e.g., rolling rainfall windows, slope class, soil/geology indicators, land-cover class, historical event density).
5. Run baseline rules and/or trained model.
6. Calibrate risk thresholds against historical validation; preserve model version and training data provenance.
7. Generate risk estimate, confidence/uncertainty, top contributing features, and data coverage.
8. Apply guardrails: stale data, out-of-domain location, insufficient features, model failure.
9. Send candidate alert to authorized review queue; publish automatically only if the agency explicitly configures and approves that policy.
10. Store predictions and outcomes for evaluation.

## 6.4 Model strategy for hackathon
- Start with a transparent baseline (rules/logistic regression/tree-based model) and a clearly labeled demo dataset.
- Do not claim “AI predicts landslides accurately” without a test set and documented metrics.
- Use time-based and geography-aware train/test splits to reduce leakage.
- Evaluate precision, recall, false-alarm rate, missed-event rate, calibration, lead time, and performance by region/season.
- Report limitations where sensor coverage or event labels are sparse.
- Use a human-in-the-loop review before public alert publication.
- A simulated scenario mode may demonstrate alert generation, but every screen/export must say **SIMULATION**.

## 6.5 Offline AI: feasible approach and limitations
Yes, an offline assistant is possible, especially for preparedness Q&A. It is not realistic to promise that a browser-only app can run a large, always-current predictive model across all devices.

### Recommended design
- **Offline guidance assistant:** small quantized local language model or compact intent/FAQ model packaged in a PWA or installed app where device memory permits; retrieval over a vetted, downloaded safety corpus.
- **Offline deterministic fallback:** decision trees and pre-approved response templates for urgent cases. This must remain available even if the local LLM cannot load.
- **Online advanced model:** server-side inference for heavier summarization/report triage, with explicit privacy and data-retention controls.
- **Risk prediction:** run validated model server-side or on edge devices with synchronized data; do not let a free-form LLM invent a hazard forecast.
- **Local language:** start with curated, reviewed Hindi/Nepali/Assamese content and templates. Machine translation may assist drafting, but reviewed content is required for safety-critical instructions.
- **Offline package:** language pack, emergency guidance, selected district profile, last-synced alerts, emergency contacts, cached map tiles where licensing allows, and model files.
- Show model status: Offline assistant ready / model unavailable / content last updated.
- Never tell users to delay evacuation or emergency contact while waiting for AI.

### AI response policy
- Answer only from approved disaster-preparedness content and current verified alert context.
- Distinguish general advice from location-specific official instructions.
- For imminent danger, give concise safe action and advise contacting local emergency services/authorities; do not ask many follow-up questions.
- No diagnosis, rescue guarantee, or invented hotline.
- If uncertain or no source is available, say so and direct to official sources.
- Provide language selection, text-to-speech where supported, and “show source” citations.
- Store minimal chat history; allow clearing it. Do not use SOS messages to train models by default.

---

# 7. Alert levels, geofencing, alarms, and notification policy

## 7.1 Risk levels
Use configurable levels, not universal claims:
- **Informational** — conditions or preparedness information.
- **Advisory** — monitor conditions and prepare.
- **Watch** — elevated risk; follow official updates and prepare to move if instructed.
- **Warning** — an authorized source indicates urgent action.
- **Emergency** — official/authorized immediate action instruction.

For AI estimates, label them “Model risk: Low / Moderate / High / Very High” and keep them distinct from official alert severity. Thresholds must be calibrated and configurable by hazard/region.

## 7.2 Area-based subscriptions
Users can subscribe to:
- Current location (with consent)
- Home locality
- Work/study locality
- Saved family locations
- Selected district(s)
- A drawn geofence (reasonable size limit)

## 7.3 Browser alarms
- Browser notification permission must be requested only after an explanatory user action.
- Sound/beep is opt-in; provide test button, volume control, quiet hours, and per-hazard preferences.
- Use service worker notifications where supported; audio playback may require prior user interaction and may not work when the browser is closed.
- Do not promise a siren when device/browser restrictions prevent it.
- Repeated alerts require deduplication, cooldown, and escalation rules.
- Critical official alerts may override user quiet hours only if the user explicitly enables that setting and local rules permit.
- Include visual, text, vibration (where supported), and screen-reader alternatives.
- Never use a beep as the only warning signal.

## 7.4 Notification channels
- In-app alert center
- Web push (opt-in)
- SMS/email/WhatsApp via approved providers (future/authorized)
- District operations queue
- Emergency contact messages (user-consented and provider-configured)
- Offline queued notification record (delivered when connectivity returns, with original issue time and expiry)

Every delivery record tracks channel, recipient/geofence, provider response, timestamps, retry count, and status. Do not mark queued messages as delivered.

---

# 8. District and regional operations dashboard

## 8.1 Operations home
- Total active alerts by hazard and verification level.
- Incidents received today, pending verification, high-priority queue.
- District risk overview map.
- Source health and freshness (weather, rainfall, sensors, official feeds, reports).
- SOS queue with age, location freshness, status, and assignment.
- Shelter/resource capacity snapshot.
- Volunteer/NGO availability summary.
- News/advisory publication status.
- Recent audit events.
- Data gaps and model health warnings.

## 8.2 Incident management
- Search/filter incidents; map/list views.
- Open incident record with timeline, reporter, consent, coordinates/accuracy, attachments, duplicate links, triage category, risk context, and access log.
- Assign to authorized team; add internal notes; update status.
- Request clarification only where safe/appropriate.
- Merge duplicates with audit trail.
- Mark false/misleading report with reason and reviewer.
- Record action taken, outcome, and closure reason.
- Export operational report with PII minimization.

Suggested incident statuses:
`NEW → TRIAGED → VERIFIED → ASSIGNED → RESPONDING → RESOLVED`
Alternative terminal statuses: `DUPLICATE`, `UNVERIFIED_CLOSED`, `CANCELLED`.
State transitions must be permission-checked and audited.

## 8.3 Alert authoring and approval
- Draft alert with hazard, severity, title, plain-language message, affected polygon/district, validity window, recommended actions, source evidence, languages, and channels.
- Preview map and recipients/geofence count.
- Require approval by authorized role for public “official” status.
- Two-person approval option for highest severity.
- Schedule, publish, expire, retract, correct, and issue update.
- Track acknowledgment/delivery metrics.
- Publicly distinguish platform-generated model advisories from authority-issued alerts.

## 8.4 Area coverage management
Admin can create/update:
- State, district, block, locality, village, geofence.
- English and reviewed local names.
- Boundary geometry and provenance.
- Hazard baseline/susceptibility layers.
- Coverage status: configured / data-connected / demo-only / inactive.
- Sensors/stations and metadata.
- Shelters, hospitals, relief points, roads, and contact records.
- Language defaults and responsible authority mapping.
- Data freshness and quality indicators.

Every edit needs validation, version history, actor, timestamp, and rollback where feasible.

## 8.5 Resource coordination
- Resource types: shelter beds, food/water, blankets, medical supplies, vehicles, boats (only where lawful/trained), rescue equipment, charging points, accessible transport.
- Store quantity, unit, location, availability, verification time, owner, and contact.
- Requests, allocation, dispatch, receipt, and reconciliation.
- Prevent public exposure of sensitive stock/security details.
- Highlight stale inventory.

## 8.6 Volunteer coordination
- Review verification documents.
- Approve/suspend profiles.
- View skills, availability, region, and assignment status.
- Create task, define safety restrictions, assign coordinator, and record completion.
- Track consent-based task location only while active.
- Report incidents involving volunteers.
- Export roster with minimum necessary personal information.

---

# 9. Platform Admin Console — full content control

The admin console must operate every public-facing module. Do not build “demo buttons” that do nothing.

## 9.1 Admin modules
1. **Overview:** platform metrics, active issues, source/model status.
2. **Users & roles:** invite, deactivate, reset access through secure flows, role assignment, district scope, MFA policy.
3. **Geography & coverage:** add/edit/archive state, district, locality, boundaries, local names, coverage flags.
4. **Hazard zones:** create/import polygons, metadata, risk layer versions, effective dates, source.
5. **Alerts:** draft/review/publish/expire/retract; translations; channels; geofence preview.
6. **News:** create/edit/publish/schedule/pin/archive; source URL, image, region tags, category, AI summary label.
7. **Media library:** upload, crop/alt text, caption, credit/license, replace/delete with reference checks; image moderation.
8. **Preparedness content:** create/edit/version/checklists, translations, reviewer, review date, download package.
9. **Shelters & facilities:** CRUD, hours, accessibility, capacity, contact, verification timestamp, temporary closure.
10. **Roads & routes:** closures, blocked segments, restrictions, source, expiry, verification.
11. **Sensors & data sources:** provider config, credentials stored in secret manager, mapping, health, sync schedule, license, data quality.
12. **AI models:** model registry, version, supported hazards/regions/languages, metrics, thresholds, rollout/rollback, last evaluation, approval status.
13. **AI knowledge base:** upload/review approved docs, chunking status, source metadata, translation status, remove stale guidance.
14. **SOS & incidents:** queue, assignment, escalation, retention, redaction, export permissions.
15. **NGO & volunteers:** applications, verification, status, tasks, incident reports.
16. **Resources:** inventory, requests, allocations, audit.
17. **Notification templates:** languages, channels, variables, test send, provider status, rate limits.
18. **Integrations:** weather, official feeds, maps, SMS/email/push, analytics; secrets never shown after save.
19. **Audit & security:** admin actions, failed logins, exports, permission changes, retention jobs.
20. **System settings:** branding, feature flags, maintenance mode, default language, map extent, demo mode, alert policy.
21. **Feedback & support:** user feedback, bug reports, abuse reports, status and assignment.

## 9.2 Admin UX requirements
- Consistent tables, filters, bulk actions, clear empty/error/loading states.
- Destructive actions require confirmation and show affected references.
- Draft/preview/publish separation.
- Every content record has status, created/updated by, timestamps, and version history.
- All form fields validated; errors shown inline.
- Use soft delete/archive for records referenced by incidents or historical alerts.
- Search works across titles, locations, IDs, tags, and source.
- Dashboard supports export only for authorized data.
- Responsive but optimized for desktop operations.

---

# 10. PostgreSQL database design

Use PostgreSQL with **PostGIS** for spatial data. Use Prisma or another migration-managed ORM for application tables; use SQL migrations for PostGIS-specific indexes/functions where needed. Store media in object storage and keep metadata/URLs in PostgreSQL; do not store large image binaries directly in relational rows.

## 10.1 Core conventions
- UUID primary keys.
- `created_at`, `updated_at`, `created_by`, `updated_by` on mutable records.
- UTC timestamps in storage; render in user/authority timezone.
- Use `timestamptz`.
- Use `geometry`/`geography` with a documented SRID (typically EPSG:4326 for web interchange; choose projected SRIDs for distance/area calculations as appropriate).
- Index foreign keys, common filters, time columns, and spatial columns (GiST).
- Use migrations; never modify production schema manually.
- Keep audit history for privileged operations.
- Separate public fields from PII and restrict access by role/scope.
- Encrypt sensitive fields where appropriate; never log passwords, tokens, or full sensitive SOS payloads.

## 10.2 Main entities / suggested tables

### Identity and access
- `users(id, email, phone, password_hash, display_name, preferred_language, status, email_verified_at, phone_verified_at, last_login_at, created_at, updated_at)`
- `roles(id, name, description)`
- `permissions(id, key, description)`
- `user_roles(user_id, role_id, scope_type, scope_id)`
- `role_permissions(role_id, permission_id)`
- `user_consents(id, user_id, consent_type, granted, policy_version, granted_at, revoked_at)`
- `trusted_contacts(id, user_id, name, relationship, phone_encrypted, verified_at, created_at)`
- `user_saved_areas(id, user_id, label, area_id, geom, is_default, notification_preferences)`
- `user_last_locations(id, user_id nullable, device_token_hash nullable, geom, accuracy_m, captured_at, expires_at, consent_id)`

### Geography and mapping
- `regions(id, parent_id, region_type, canonical_name, state_code, district_code, local_names JSONB, default_language, geom, boundary_source, boundary_version, coverage_status, active)`
- `hazard_zones(id, region_id nullable, hazard_type, name, geom, baseline_level, source, valid_from, valid_to, version, status)`
- `map_features(id, feature_type, name, geom, properties JSONB, source, verified_at, active)`
- `road_segments(id, external_id, geom, road_class, status, restrictions JSONB, source, verified_at, valid_until)`
- `road_reports(id, road_segment_id nullable, geom, status, report_id nullable, source, observed_at, verified_at, expires_at)`
- `facilities(id, facility_type, name, region_id, geom, address, phone, capacity, accessibility JSONB, hours JSONB, status, verified_at, source)`
- `facility_capacity_updates(id, facility_id, available_units, unit_type, reported_at, reported_by, verification_status)`

### Weather, sensors, and data provenance
- `data_sources(id, name, source_type, provider, endpoint_reference, license, refresh_interval_minutes, enabled, secret_reference, health_status, last_success_at, last_error_at)`
- `weather_observations(id, source_id, region_id nullable, station_id nullable, geom nullable, observed_at, rainfall_mm, rainfall_1h_mm, rainfall_3h_mm, rainfall_24h_mm, temperature_c, humidity_pct, wind_kph, raw_payload JSONB, quality_flags JSONB)`
- `sensor_stations(id, source_id, name, sensor_type, geom, region_id, units, metadata JSONB, active, last_seen_at)`
- `sensor_readings(id, station_id, observed_at, value_numeric, unit, quality_status, raw_payload JSONB)`
- `river_observations(id, source_id, station_id, geom, observed_at, level_m, flow_m3s, quality_status)`
- `ingestion_runs(id, source_id, started_at, finished_at, status, records_received, records_accepted, records_rejected, error_summary, checksum)`

### AI and risk
- `model_registry(id, name, version, model_type, supported_hazards, supported_regions, artifact_uri, training_data_ref, metrics JSONB, limitations TEXT, status, approved_by, approved_at)`
- `risk_predictions(id, model_id, region_id nullable, geom, hazard_type, horizon_minutes, risk_level, risk_score, confidence, data_coverage_pct, top_features JSONB, input_snapshot JSONB, generated_at, expires_at, simulation_mode)`
- `prediction_outcomes(id, prediction_id, outcome_type, observed_at, source, reviewer_id, notes)`
- `risk_thresholds(id, hazard_type, region_id nullable, model_id nullable, thresholds JSONB, effective_from, effective_to, approved_by)`
- `model_evaluations(id, model_id, evaluation_period, dataset_ref, metrics JSONB, evaluator_id, created_at)`

### Alerts and notifications
- `alerts(id, alert_type, issuer_type, issuer_name, external_id, title, body, severity, model_risk_level, confidence, source_url, geom, region_ids UUID[], issued_at, valid_from, expires_at, status, verification_status, language_versions JSONB, approved_by, published_at, version, simulation_mode)`
- `alert_events(id, alert_id, event_type, actor_id, payload JSONB, created_at)`
- `subscriptions(id, user_id nullable, device_token_hash nullable, area_id nullable, geom nullable, hazards TEXT[], channels TEXT[], quiet_hours JSONB, sound_enabled, enabled, consent_id)`
- `notification_deliveries(id, alert_id nullable, incident_id nullable, recipient_ref, channel, provider, status, queued_at, sent_at, delivered_at, acknowledged_at, attempts, provider_message_id, error_code, simulation_mode)`
- `notification_templates(id, key, language, channel, subject, body, version, reviewed_by, status)`
- `push_devices(id, user_id, token_encrypted, platform, last_seen_at, revoked_at)`

### SOS and incidents
- `incidents(id, incident_code, incident_type, priority, status, description, geom, location_accuracy_m, location_captured_at, location_kind, people_count, needs JSONB, reporter_user_id nullable, reporter_contact_encrypted nullable, consent_snapshot JSONB, source_channel, verification_status, assigned_team_id nullable, created_at, updated_at, closed_at, retention_until)`
- `incident_attachments(id, incident_id, object_key, media_type, size_bytes, checksum, uploaded_at, visibility, moderation_status)`
- `incident_events(id, incident_id, actor_id, event_type, from_status, to_status, note, payload JSONB, created_at)`
- `incident_assignments(id, incident_id, team_id nullable, volunteer_id nullable, assigned_by, assigned_at, accepted_at, completed_at, status)`
- `incident_relations(id, incident_id, related_incident_id, relation_type, created_by)`
- `incident_access_logs(id, incident_id, actor_id, action, accessed_at, reason)`

### Volunteers and NGOs
- `organizations(id, name, org_type, registration_reference_encrypted, service_regions UUID[], languages TEXT[], contact_encrypted, verification_status, verified_by, verified_at, status)`
- `volunteer_profiles(id, user_id, organization_id nullable, skills TEXT[], languages TEXT[], service_regions UUID[], availability_status, equipment JSONB, vehicle JSONB, training JSONB, verification_status, approved_by, approved_at)`
- `volunteer_documents(id, volunteer_id, object_key, document_type, status, reviewed_by, reviewed_at, expires_at)`
- `response_tasks(id, title, task_type, description, geom, region_id, risk_brief JSONB, required_skills TEXT[], capacity, status, coordinator_id, start_at, end_at, safety_constraints JSONB)`
- `task_assignments(id, task_id, volunteer_id, status, assigned_at, accepted_at, checkin_at, checkout_at, completion_note)`
- `volunteer_location_pings(id, volunteer_id, task_assignment_id, geom, captured_at, expires_at, consent_id)`

### Content, news, and media
- `news_items(id, title, summary, publisher, source_url, published_at, fetched_at, region_ids UUID[], categories TEXT[], image_media_id nullable, language, status, pinned, ai_summary, demo_label, created_by)`
- `media_assets(id, object_key, mime_type, size_bytes, alt_text, caption, credit, license, source_url, checksum, uploaded_by, moderation_status, created_at)`
- `content_pages(id, slug, title, body, content_type, hazard_type, region_ids UUID[], language, version, status, reviewed_by, reviewed_at, next_review_at)`
- `translation_records(id, entity_type, entity_id, language, translated_fields JSONB, review_status, reviewer_id, reviewed_at)`
- `knowledge_documents(id, title, source, source_url, language, version, review_status, effective_from, expires_at, object_key, checksum, uploaded_by)`

### Administration and governance
- `audit_logs(id, actor_id, action, entity_type, entity_id, before JSONB, after JSONB, ip_hash, user_agent_summary, created_at)`
- `system_settings(id, key, value JSONB, updated_by, updated_at)`
- `integration_configs(id, provider, config_public JSONB, secret_reference, status, last_tested_at, last_error)`
- `feedback_items(id, user_id nullable, category, message, page_path, status, assigned_to, created_at, resolved_at)`
- `feature_flags(id, key, enabled, config JSONB, updated_by, updated_at)`

## 10.3 PostgreSQL / PostGIS requirements
- Enable PostGIS.
- GiST indexes on `regions.geom`, `hazard_zones.geom`, `incidents.geom`, `alerts.geom`, `facilities.geom`, `road_segments.geom`, and relevant report geometries.
- Use `ST_Intersects`/`ST_DWithin` for geofence matching and nearby-facility queries.
- Validate geometries (`ST_IsValid`) on import; normalize and record repair.
- Use spatial aggregation / vector tiles for large map layers.
- Partition high-volume `sensor_readings`, `weather_observations`, `notification_deliveries`, and `audit_logs` by time when scale warrants it.
- Use JSONB for flexible provider payloads and model explanations, not as a substitute for normalized core relations.
- Add constraints for valid latitude/longitude, nonnegative counts, valid time windows, and allowed status values.
- Define retention and archival jobs for location pings, SOS data, and telemetry.

---

# 11. API contract outline

Use REST under `/api/v1` (or a clearly documented equivalent). Validate all inputs with schemas; return consistent errors and pagination.

## Public endpoints
- `GET /regions?query=&type=&parentId=`
- `GET /map/layers`
- `GET /map/features?bbox=&layer=&since=`
- `GET /risk?regionId=&hazard=&horizon=`
- `GET /alerts?regionId=&status=&hazard=&since=`
- `GET /news?regionId=&limit=&cursor=`
- `GET /facilities?near=&type=&radius=`
- `POST /reports`
- `GET /reports/{id}` (own report or public-safe version)
- `POST /sos`
- `GET /sos/{incidentCode}` (authorized reporter/role only)
- `POST /subscriptions`
- `DELETE /subscriptions/{id}`
- `GET /preparedness?hazard=&language=`
- `POST /assistant/query` (online assistant; strict safety and privacy controls)
- `POST /offline-sync/reports` (idempotent queued submissions)

## Authenticated user endpoints
- `GET /me`
- `PATCH /me/preferences`
- `POST /me/last-location` (consent required)
- `DELETE /me/last-location`
- `POST /me/trusted-contacts`
- `GET /me/incidents`
- `GET /me/subscriptions`

## Operations endpoints
- `GET /ops/incidents`
- `PATCH /ops/incidents/{id}`
- `POST /ops/incidents/{id}/assign`
- `POST /ops/incidents/{id}/events`
- `POST /ops/alerts/draft`
- `POST /ops/alerts/{id}/approve`
- `POST /ops/alerts/{id}/publish`
- `POST /ops/alerts/{id}/retract`
- `GET /ops/coverage`
- `POST /ops/regions`
- `PATCH /ops/regions/{id}`
- `POST /ops/facilities`
- `PATCH /ops/facilities/{id}`
- `POST /ops/road-closures`
- `GET /ops/data-health`
- `GET /ops/model-health`

## Admin endpoints
- CRUD endpoints for news, media metadata, preparedness content, translations, data sources, model registry, thresholds, users/roles, volunteers/NGOs, resources, templates, integrations, settings, feature flags.
- All privileged mutations require authorization, input validation, audit log, and CSRF protection where cookie auth is used.
- Never expose provider secrets in GET responses.

---

# 12. Suggested technology stack

Choose technologies the team can implement and explain. Keep the architecture modular.

## Frontend
- Next.js + TypeScript
- React
- Tailwind CSS + accessible component system
- MapLibre GL JS or Leaflet for map; use a provider whose terms permit the intended use
- Recharts or ECharts for charts
- PWA service worker for offline shell, cached content, and queued submissions
- i18next/FormatJS or equivalent for localization

## Backend
- Next.js route handlers or a separate Node.js/NestJS/Fastify API
- TypeScript with schema validation
- PostgreSQL + PostGIS
- Prisma for standard CRUD plus SQL migrations for spatial features
- Redis/queue (BullMQ or equivalent) for ingestion, notifications, and background jobs
- Object storage (S3-compatible) for images and incident attachments
- WebSocket/SSE for live dashboard updates where available

## AI / data
- Python service (FastAPI) for model inference and data pipelines
- scikit-learn / XGBoost / LightGBM or a validated geospatial ML approach
- GeoPandas/rasterio where licensed datasets and infrastructure permit
- Retrieval-based assistant over reviewed content; local quantized model for offline mode
- Model registry and evaluation scripts

## Deployment
- Docker Compose for local development
- Managed PostgreSQL with PostGIS or self-hosted PostGIS
- Separate staging and production environments
- Secrets manager / environment variables
- CI checks: lint, typecheck, tests, migrations, dependency/security scan
- Monitoring: uptime, structured logs, ingestion freshness, queue depth, failed notifications, model latency
- Backups with tested restore procedure

---

# 13. Design system and visual direction

## 13.1 Look and feel
A polished emergency-intelligence product: confident, modern, calm, legible, and information-dense without clutter. Use a deep navy/blue base, neutral surfaces, and restrained hazard colors. Avoid copying the reference portal’s layout or branding.

## 13.2 Layout rules
- 12-column desktop grid; consistent spacing scale (4/8/12/16/24/32).
- Align card edges, chart axes, map controls, and section headers.
- Use responsive breakpoints and avoid horizontal overflow.
- Use clear hierarchy: page title → summary → actions → details.
- Cards share consistent radius, border, padding, and title placement.
- Use charts with labels, units, legend, source, timestamp, and accessible text summary.
- Keep critical SOS action consistently reachable but not accidentally triggered.
- Use skeletons for loading, informative empty states, and retry actions.
- Provide light/dark theme only if contrast remains accessible.
- Do not overuse glassmorphism, gradients, animation, or decorative map pins.

## 13.3 Accessibility
- Target WCAG 2.2 AA.
- Keyboard navigation and visible focus.
- Screen-reader labels for map controls and charts.
- High contrast and scalable text.
- Do not encode severity by color alone.
- Reduced-motion preference.
- Text alternatives for all essential media.
- Audio content has captions/transcripts.
- Local-language text must render correctly, including Indic scripts.
- Forms identify errors and required fields clearly.

---

# 14. Data sources and source governance

The app should support adapters for approved sources such as:
- IMD weather forecasts and warnings, subject to access terms.
- NDMA / Sachet public alert information and official bulletins, subject to permitted access.
- Geological Survey of India landslide susceptibility or related public datasets where available and licensed.
- State/district disaster-management bulletins.
- Central/state water or river-gauge sources where access is authorized.
- Survey of India / other permitted boundary and topographic datasets.
- OpenStreetMap data under its attribution and usage requirements.
- Satellite or rainfall products only under their licensing and technical constraints.
- Community reports, explicitly labeled and moderated.

**Implementation rule:** Verify the exact API/feed, terms, refresh cadence, attribution, and allowed redistribution before integration. If no stable API exists, allow a human operator to import a bulletin or use a documented manual workflow. Store source URL, retrieval time, issue time, license, and quality status. Do not scrape restricted sources or invent a data partnership.

---

# 15. Security, privacy, and responsible operation

- Least-privilege RBAC with district/region scope.
- MFA for admins and operational roles.
- Secure password hashing; rate-limited authentication; secure session cookies.
- Validate and sanitize all user inputs and uploaded files.
- Malware scanning and size/type limits for attachments.
- Encrypt data in transit and sensitive data at rest.
- Avoid exposing exact SOS locations to public users.
- Consent and purpose limitation for location, push, and volunteer tracking.
- Retention periods and deletion workflows; default to minimal retention.
- Log access to sensitive incidents and export actions.
- Prevent IDOR by checking ownership and scope on every endpoint.
- CSRF protection where applicable; CSP and secure headers.
- Secrets in a secret manager; never commit `.env`.
- Backups encrypted and restore-tested.
- Abuse controls: spam throttling, duplicate detection, report moderation, escalation limits.
- Incident-response plan for data breach or compromised admin account.
- Privacy notice in plain language and local languages.
- Legal review for real emergency dispatch, personal data processing, and public warning claims.

---

# 16. Reliability, offline behavior, and graceful degradation

## Offline-first requirements
- App shell and critical pages cached.
- User-selected area’s latest alerts, preparedness guides, emergency contacts, and selected map area available offline where feasible.
- Offline assistant works on vetted cached content if model assets are available.
- SOS/report can be queued offline, but UI must say **“Not yet sent—waiting for connection”**.
- Show queue count, last sync, and retry.
- Preserve original event time and capture time on sync.
- Use idempotency keys to prevent duplicate SOS/report creation.
- Detect stale cached alerts and prominently show their age/expiry.
- Never treat cached information as current.
- Provide manual call/contact guidance that does not depend on data connectivity (only show verified numbers configured for that jurisdiction).

## Reliability targets for MVP
- Public core pages load under 3 seconds on a reasonable 4G connection with optimized assets (target, not guarantee).
- API errors are visible and recoverable.
- No silent failure for SOS, alert publishing, or data ingestion.
- Background ingestion retries with backoff and dead-letter handling.
- Monitoring for feed freshness and notification failures.
- Graceful fallback if AI model, map tiles, or news feed is unavailable.

---

# 17. Analytics and operational metrics

## Public product analytics (privacy-preserving)
- Visits by region at aggregate level.
- Alert views/acknowledgments.
- Preparedness guide opens/downloads.
- SOS flow completion/failure, aggregated.
- Language selection and accessibility feature usage.
- Offline cache success and sync success.
- No collection of precise location analytics by default.

## Operations metrics
- Time from report submission to triage/verification/assignment.
- Active incident backlog and aging.
- Alert delivery and acknowledgment rates by channel.
- Source freshness and ingestion error rate.
- Shelter capacity freshness.
- Volunteer task acceptance/completion.
- Model precision/recall, false alarms, missed events, lead time, calibration, coverage, and drift.
- Translation review coverage.
- Route data freshness and blocked-route report latency.

---

# 18. Acceptance criteria

## 18.1 Public experience
- A user can select a locality without granting GPS permission.
- User can view a map, toggle layers, search localities, and inspect feature details.
- Alerts display issuer, source, timestamps, validity, severity, and verification status.
- News cards link to original sources and show publish/fetch timestamps.
- User can change language; supported content switches and unsupported translations fall back transparently.
- SOS flow captures GPS only with consent and clearly shows submission status.
- Last-known location is labeled with capture time and can be deleted.
- User can find verified facilities and see route limitations.
- Offline mode shows cached timestamp and does not falsely report queued messages as sent.
- All controls work; no dead buttons or placeholder links in the accepted MVP.

## 18.2 Operations/admin
- Authorized district operator can filter, view, assign, update, and close incidents with audit trail.
- Authorized operator can draft, preview, approve, publish, expire, and retract an alert.
- Admin can add/edit/archive localities, facilities, hazard zones, news, images, language strings, and preparedness content.
- Admin can inspect data source freshness and ingestion errors.
- Admin can configure demo mode and see explicit simulation labels.
- Admin can approve/reject volunteer/NGO applications and assign tasks.
- Role boundaries are tested at API level.

## 18.3 AI
- Risk estimate includes model version, horizon, input freshness, data coverage, uncertainty, and explanation.
- Missing/stale inputs produce an explicit degraded/no-estimate state.
- AI-generated advice cites approved knowledge sources.
- Offline assistant has a deterministic fallback and clearly indicates its data update time.
- Model performance is measured on a held-out dataset or clearly labeled as a prototype without validated performance.
- No generated prediction is presented as an official warning.

## 18.4 Engineering
- Database migrations create required schema and spatial indexes.
- Seed script loads demo regions, facilities, alerts, news, reports, and users with safe test credentials.
- Automated tests cover auth, RBAC, SOS, alert lifecycle, geofence matching, offline sync idempotency, and admin CRUD.
- No secrets or real personal data in repository or seed data.
- Error, loading, empty, and offline states are implemented.

---

# 19. Demo data and simulation mode

Create a controlled demo environment that looks rich but is honest:
- 10–15 pilot localities across Himalayan/Northeastern states.
- Synthetic weather/sensor time series clearly labeled `DEMO`.
- Example landslide and flood incident markers clearly labeled `DEMO`.
- Demo alert polygons and delivery receipts clearly labeled `SIMULATED`.
- Demo SOS with fabricated identity/contact data; never use real residents’ details.
- Demo volunteer/NGO accounts and task assignments.
- Demo news cards only if explicitly marked; otherwise use actual linked source metadata after verification.
- Demo model output shows feature contributions and sample confidence, but labels metrics “illustrative” unless evaluated.
- A “Run disaster scenario” control for judges: select rainfall scenario → show risk layer change → create candidate alert → simulate geofence notifications → show operator review → create response task → display route alternatives with explicit simulation label.

---

# 20. Feature prioritization and delivery plan

## P0 — hackathon MVP (must work end-to-end)
1. Responsive public home with selected location, risk summary, active alerts, news window, quick actions.
2. Map with locality search, hazard/incident markers, layer toggles, facility markers, legend, details drawer.
3. PostgreSQL + PostGIS schema and seeded pilot geography.
4. Auth + RBAC for public, district operator, admin, volunteer.
5. Alerts list/detail and admin alert authoring lifecycle.
6. Community report form + moderation queue.
7. SOS workflow with consent, GPS/manual/last-known location, incident ID, delivery state, and simulated admin routing.
8. Admin CRUD for localities, alerts, news, media, facilities, preparedness content.
9. Risk prototype using transparent rules or a documented baseline; display confidence/data freshness and simulation label.
10. Offline PWA shell, cached preparedness content, offline queue for reports/SOS with clear pending status.
11. English + Hindi; add Nepali and Assamese reviewed demo strings for pilot areas.
12. Charts for rainfall/risk trend, incident counts, alert counts, source freshness.
13. Full seed/reset script and judge demo scenario.

## P1 — strong differentiators
- Offline local-language retrieval assistant with deterministic emergency fallback.
- Geofenced push notifications and opt-in sound.
- Volunteer/NGO onboarding, verification, task board, check-in/out.
- Route assistance with road closure overlays and safety caveats.
- Sensor/source ingestion adapters and health dashboard.
- Model registry, evaluation report, explainability, and historical replay.
- Shelter capacity and resource allocation.
- Local-language audio/read-aloud.
- Family check-in and trusted contacts.

## P2 — post-hackathon / authority partnership
- Authorized SMS/WhatsApp gateway and official district dispatch integration.
- Live sensor network, river gauges, licensed satellite/rainfall layers.
- Robust offline model distribution and device-specific performance optimization.
- Cross-border information exchange with relevant Nepal authorities.
- Advanced hydrological/geotechnical modeling and validated district calibration.
- Multi-agency incident command, resource logistics, and formal audit/compliance workflows.

---

# 21. Suggested hackathon demo storyline (5–7 minutes)

1. **Start on Home:** select “Mangan, Sikkim” (demo location); show current demo data timestamp and risk summary.
2. **Open Live Map:** enable rainfall, slope, and incident layers; explain the difference between baseline susceptibility and current model estimate.
3. **Run Scenario:** simulate intense rainfall over a selected catchment; show input changes and resulting model risk estimate, uncertainty, and top contributing factors.
4. **Candidate alert:** system drafts a localized warning in English/Hindi/Nepali; operator reviews source, polygon, validity, and translations.
5. **Publish simulation:** show geofence preview and simulated notification delivery receipts. Make clear it is not actually sent.
6. **Resident SOS:** submit a demo SOS with a last-known location; show queued/sent/acknowledged states accurately.
7. **Operations dashboard:** triage and assign the incident; see timeline and audit record.
8. **Volunteer workspace:** assign an approved demo volunteer to a safe support task; show check-in controls.
9. **Route support:** show route alternatives avoiding a demo road closure and display route caveat.
10. **Offline toggle:** show cached guide and offline assistant; queue a report and sync when online.
11. **Admin console:** add a news item, edit a locality’s local name, replace a media image, update a facility, and show changes reflected on public pages.

---

# 22. Build instructions for the AI coding model

You are the senior product engineer building **PurvaGuard AI**. Build a coherent, runnable full-stack application—not a static mockup.

## 22.1 Mandatory implementation behavior
- Begin by creating a clear project structure, database schema/migrations, seed data, and a concise README.
- Implement real CRUD and connect every visible control to actual state/API behavior.
- Use PostgreSQL + PostGIS as the system of record. If local environment lacks PostGIS, provide a documented Docker Compose setup.
- Include `.env.example` with placeholder names only; never commit secrets.
- Implement server-side role and region-scope authorization.
- Include loading, empty, error, offline, stale-data, and success states.
- Include safe demo mode with visibly simulated external integrations.
- Add tests for critical flows.
- Use accessible responsive components and consistent spacing/design tokens.
- Do not invent official live data, source partnerships, emergency numbers, or delivery confirmations.
- If an external API key is absent, use a clearly labeled adapter/mock and show integration health.
- Preserve provenance for every map layer, chart, alert, news item, and AI result.
- Build in vertical slices: database → API → UI → tests → seed/demo.
- Keep the interface polished, aligned, and operationally clear.

## 22.2 Recommended repository structure
```text
/apps
  /web                 # Next.js public site + protected dashboards
  /api                 # API service if separated
/services
  /risk-engine         # Python model/inference service
  /ingestion           # scheduled data adapters
/packages
  /ui                  # shared accessible components
  /i18n                # translation resources
  /schemas              # shared validation schemas
  /config               # lint/tsconfig/design tokens
/prisma
  schema.prisma
  migrations/
/scripts
  seed-demo.ts
  reset-demo.ts
  import-regions.ts
/tests
  e2e/
  integration/
/docs
  architecture.md
  data-sources.md
  privacy-and-safety.md
  api.md
docker-compose.yml
.env.example
README.md
```

## 22.3 Required seed accounts
Use fake credentials and force password change or clearly mark development-only:
- `resident.demo`
- `district.operator.demo`
- `state.operator.demo`
- `admin.demo`
- `volunteer.demo`
- `ngo.coordinator.demo`
Never reuse real email addresses, phone numbers, or passwords.

## 22.4 Completion checklist
Before declaring completion:
- Start the app from documented clean setup.
- Run migrations and seed successfully.
- Test each role and attempt forbidden cross-role access.
- Exercise report → review → verification.
- Exercise SOS → operator queue → assignment → closure.
- Exercise alert draft → approval → publish → expiry/retraction.
- Exercise admin add/edit/delete/archive and confirm public display updates.
- Test mobile layout and keyboard navigation.
- Test offline queue, reconnect, and duplicate prevention.
- Verify every simulated integration is visibly labeled.
- Confirm no dead controls, broken links, or fabricated live claims.
- Provide a concise run guide, environment variable list, architecture summary, and known limitations.

---

# 23. Final product definition

PurvaGuard AI succeeds when a resident can quickly answer:
1. **What is happening near me?**
2. **How reliable and recent is this information?**
3. **What should I do now?**
4. **Where can I go, and what route information is actually verified?**
5. **How do I request help, and has my message really been received?**

And an authorized operator can quickly answer:
1. **Which reports need action?**
2. **What evidence supports this alert or risk estimate?**
3. **Who is affected, and what notification was actually delivered?**
4. **Which facilities, teams, and resources are available?**
5. **What changed, who changed it, and what is still uncertain?**

**The product’s credibility depends as much on honest uncertainty, source transparency, privacy, and operational safety as on the number of features.**
