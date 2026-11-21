# Family Care Hub — 3-Minute Hackathon Demo Script
**Track:** Problem Statement 4 (Health & Family Care)  
**Presenters:** Member A & Member B  
**Target Scenario:** Sharma Family coordinating elder care for Kamala Sharma (74, Pune).  
**Default Password for all Demo Accounts:** `Demo@1234`

---

## Demo Persona Roster

| Role | Name | Email | Location | Device / View |
|---|---|---|---|---|
| **Owner** | Anjali Sharma | `anjali@example.com` | Bengaluru (Remote sibling) | Desktop Browser |
| **Caregiver** | Rohit Sharma | `rohit@example.com` | Pune (Local sibling) | Mobile / Tablet View |
| **Viewer** | Vikram Sharma | `vikram@example.com` | Dubai (Overseas sibling) | Incognito / Secondary Tab |
| **Care Recipient** | Kamala Sharma | `kamala@example.com` | Pune (Mother, 74) | Mobile Care Mode |

---

## Demo Timeline (Total: 180 seconds)

### 0:00 – 0:35 | Act I: The 10-Second Test & Remote Visibility
- **Action:** Open the deployed application URL in Chrome on desktop.
- **Log In:** Sign in as **Anjali Sharma** (`anjali@example.com` / `Demo@1234`).
- **Narrative:**
  > *"Meet Anjali. She lives in Bengaluru, 800 km away from her 74-year-old mother Kamala in Pune. In less than 10 seconds, she opens Family Care Hub. Immediately, the Status Board delivers absolute clarity:"*
- **Visual Callouts:**
  - Red traffic-light banner: **"Needs attention: 1 medication refill overdue"**.
  - Show the overdue refill: **Amlodipine (Blood Pressure)** assigned to her brother Rohit in Pune.
  - Next upcoming doctor consultation: Tomorrow morning with Dr. Kulkarni (Cardiology).

---

### 0:35 – 1:15 | Act II: Local Execution & Live Reactive Board
- **Action:** Open a side-by-side browser window or mobile viewport.
- **Log In:** Sign in as **Rohit Sharma** (`rohit@example.com` / `Demo@1234`).
- **Narrative:**
  > *"Rohit is on the ground in Pune. He visits the pharmacy, buys the medicines, and opens Family Care Hub on his phone."*
- **Steps:**
  1. Rohit navigates to **Meds & Refills** (`/c/[circleId]/meds`).
  2. Point out the medical safety guardrail: *"Instructions are rendered strictly verbatim as written on the prescription: '1 tablet once daily after breakfast'. No dosage calculation, no medical advice."*
  3. Rohit taps **Mark Refilled**.
  4. Modal asks: *"How many units received?"* Rohit types `30` tablets and taps **Confirm Refill**.
- **The Magic Moment (Live Reactivity without WebSockets):**
  - Look at Anjali's desktop screen in Bengaluru:
  - Within 10 seconds, through lightweight Redis version polling, Anjali's screen automatically revalidates!
  - The status board flips from **Red** to **Green ("All care items on track")**.
  - No anxious WhatsApp messages. Total transparency.

---

### 1:15 – 1:55 | Act III: Appointment Lifecycle & Linked Task Automation
- **Action:** Rohit navigates to **Appointments** (`/c/[circleId]/appointments`).
- **Steps:**
  1. Click **Schedule Appointment**:
     - Title: `Cardiology Follow-Up`
     - Doctor: `Dr. A. Kulkarni`
     - Location: `Deenanath Mangeshkar Hospital, Pune`
     - Starts: Tomorrow 10:30 AM
     - Accompanied by: `Rohit Sharma`
     - Checkboxes left checked: *"Create task: prepare documents"* and *"Create task: accompany"*.
  2. Tap **Schedule Visit**.
  3. Show that two linked tasks are instantly created and assigned to Rohit on the Tasks board.
  4. Click **Add to Calendar** -> Downloads `.ics` file with neutral, privacy-safe title.
  5. Demonstrate the post-visit resolution prompt: Show completed visit resolution with **"How did it go?"** button allowing one-tap status updates and report attachment.

---

### 1:55 – 2:30 | Act IV: Secure Private Documents & Sensitivity Grants
- **Action:** Switch to Anjali or Rohit.
- **Steps:**
  1. Open **Medical Documents** (`/c/[circleId]/documents`).
  2. Click **Upload Document**:
     - Upload sample discharge summary / lab report (`sample-blood-test.pdf`).
     - Point out the security pipeline: Magic-bytes verification (rejects fake extensions), EXIF stripping via Sharp, and private storage in Vercel Blob.
     - Toggle sensitivity to **Restricted**.
  3. Switch to **Vikram in Dubai** (`vikram@example.com`, Viewer role):
     - Vikram opens the **Timeline** (`/c/[circleId]/timeline`).
     - The restricted report displays privacy masking: **"Restricted document"** with a lock icon. Vikram cannot view or download it.
  4. Switch back to Anjali (Owner):
     - Opens document viewer, clicks **Grant Access**, selects Vikram.
     - Vikram refreshes: document title is revealed and he can download a 60-second signed URL!
     - Show **"Viewed by"** audit log tracking all access timestamps.

---

### 2:30 – 3:00 | Act V: Care-Recipient Mode & Conclusion
- **Action:** Switch to **Kamala Sharma** (`kamala@example.com` / `Demo@1234`).
- **Narrative:**
  > *"Finally, what about our elderly parent? Kamala is 74. She doesn't need complex kanban boards or cloud settings. When she logs in, she is automatically routed to Care-Recipient Mode."*
- **Visual Callouts:**
  1. High-contrast, 24px large font display.
  2. Exactly two focused cards:
     - **"Today's Medicines"**: Large font medication name and verbatim prescription instructions.
     - **"Next Doctor Visit"**: *"Tomorrow at 10:30 AM — Rohit is coming with you."*
  3. Massive green **"Call Family (Rohit)"** emergency button that triggers direct phone dialing.
- **Closing Punchline:**
  > *"Family Care Hub delivers military-grade privacy, verifiable medical safety, and 10-second clarity for families caring for the people who cared for them first. Thank you."*
