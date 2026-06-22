# Consultation Booking — setup guide

The Contact page (`contact.html`) has an inquiry form. Filling it in (name,
email, message) is **required**. Booking a consultation time is **optional** —
ticking *"Book a consultation time"* reveals a month **calendar**; pick a day,
then a 30-minute slot. On submit:

1. **Emails the inquiry** to `hello@inspirehospitality.com` — via EmailJS if
   configured, otherwise it falls back to opening the visitor's mail client
   (so the form works even before you wire up EmailJS). If a time was chosen,
   it's included in the email.
2. **Records the slot** to a Google Sheet (only when a time was picked) — which
   greys that slot out for everyone else (the "already booked/requested"
   behaviour).

A submitted time is a **request, not a confirmed appointment** — you reply to
confirm. An unconfirmed slot frees itself again after **7 days** (configurable),
unless you mark it Confirmed in the Sheet.

The form renders and works before you do any of the steps below: with no keys it
opens the visitor's mail client; greying of taken slots starts working once the
Google Sheet is connected.

---

## Part 1 — Google Sheet backend (greys out taken slots)

1. Create a new Google Sheet (any Google account). Name it e.g. *Inspire Bookings*.
2. **Extensions → Apps Script**. Delete the default code.
3. Paste the entire contents of `docs/booking-apps-script.gs`. Save.
4. **Deploy → New deployment → Type: Web app.**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Click **Deploy**, authorise when prompted.
5. Copy the **Web app URL** (ends in `/exec`).
6. Open `assets/js/script.js`, find `BOOKING_CONFIG`, and paste it:

   ```js
   appsScriptUrl: "https://script.google.com/macros/s/AKfyc..../exec",
   ```

The script auto-creates a **Bookings** tab with these columns:

| Timestamp | Date | Time | Name | Email | Organisation | Phone | Notes | Timezone | Confirmed | Expires |
|-----------|------|------|------|-------|--------------|-------|-------|----------|-----------|---------|

- To **lock a slot permanently** (so it never frees up): set that row's
  **Confirmed** cell to `TRUE`.
- To **release a slot early**: delete the row (or clear its Expires date to the past).

> If you change the `.gs` code later, you must **Deploy → Manage deployments →
> Edit → New version** for it to take effect. The `/exec` URL stays the same.

---

## Part 2 — EmailJS (sends you the request email)

1. Sign up at <https://www.emailjs.com> (free tier: 200 emails/month).
2. **Email Services → Add** your sending account (Gmail/Outlook). Note the
   **Service ID** (e.g. `service_xxx`).
3. **Email Templates → Create**. In the template:
   - **To email:** `{{to_email}}`  (or hardcode `hello@inspirehospitality.com`)
   - **Subject:** `Website inquiry — {{name}} ({{type}})`
   - **Content:** use these variables:

     ```
     New inquiry from the website:

     Name:          {{name}}
     Email:         {{email}}
     Organisation:  {{organisation}}
     Phone:         {{phone}}
     Nature:        {{type}}

     Message:
     {{message}}

     — Consultation time —
     Requested:  {{bookingRequested}}
     When:       {{weekday}}, {{dateLabel}} at {{timeLabel}}
     Zone:       {{timezone}}
     ```
   (When no time is booked, `{{bookingRequested}}` is `No` and the When/Zone
   lines are blank.)
   Note the **Template ID** (e.g. `template_xxx`).
4. **Account → General**: copy your **Public Key**.
5. Paste all three into `BOOKING_CONFIG` in `assets/js/script.js`:

   ```js
   emailjs: {
     publicKey: "your_public_key",
     serviceId: "service_xxx",
     templateId: "template_xxx",
   },
   ```
6. **Security (recommended):** in EmailJS → Account → Security, restrict sending
   to your website domain and/or enable a captcha, since the keys are visible in
   client-side JS.

---

## Adjusting the rules

All in `BOOKING_CONFIG` at the top of the booking block in `assets/js/script.js`:

| Setting | Default | Meaning |
|---|---|---|
| `businessDays` | `[1,2,3,4,5]` | Mon–Fri (0=Sun … 6=Sat) |
| `startHour` / `endHour` | `10` / `17` | Office hours; last slot starts 16:30 |
| `slotMinutes` | `30` | Slot length |
| `maxDaysAhead` | `60` | How far ahead the calendar lets people book |
| `timezoneLabel` | China Standard Time | Text shown under "What time works best?" |
| `notifyEmail` | hello@inspirehospitality.com | Recipient (also passed to EmailJS as `to_email`) |

The hold-expiry window lives in `booking-apps-script.gs` as `HOLD_DAYS` (default `7`).

---

## Notes & limitations

- Because there's no real calendar, slots reflect **requests in the Sheet**, not
  live calendar availability. Two people *can't* both grab the same slot once
  one is recorded, but the system can't know about meetings booked elsewhere.
- Times are shown in a single fixed business timezone (`timezoneLabel`) to keep
  greying consistent across visitors in different regions. The chosen time +
  timezone are included in every email.
- Both parts are independent: with only the Sheet configured, slots grey out but
  you get no email; with only EmailJS, you get emails but slots don't grey out.
  Configure both for the full behaviour.
