# Opportunity OS — Winter Internships and Outreach Studio

This feature lives on the `opportunity-os-hosted` branch of the existing project. It does not modify the GitHub profile `main` branch.

## Winter Internships

Open **Winter internships** from the private workspace sidebar. The collection reads already-imported opportunities and selects internship listings with evidence of the current winter intake (winter wording, November/December of the starting year, or January/February of the following year). The filter is not an availability check. Always verify original listing, 2028-batch eligibility, location, start date, compensation and actual employer application instructions. Empty results mean no matching evidence has been imported; they do not mean no winter internships exist.

## Outreach Studio

Open **Outreach Studio** after signing into Opportunity OS.

1. Upload a contact sheet (.xlsx or UTF-8 .csv, at most 4 MB). Import supports up to 6,000 parsed rows; the preview shows the first 150 rows and total counts. Search contacts to work through large lists.
2. Click **Inspect spreadsheet**. The backend reads up to 10 Excel sheets, recognizes common company, email, name, designation and notes headers, extracts addresses actually present in the file, and reports missing/ambiguous values. It **never guesses or generates email addresses**.
3. Check companies and recipients. Click **Confirm import**. Invalid email, absent company, duplicate and automated/no-reply records are not imported as ready contacts. Personal email domains are flagged for manual verification. Existing imported records are preserved.
4. Select one contact and choose **Smart prepare** (rules-based personalized template) or **Self-send** (write the email yourself). Choose Winter 2026–27, Summer 2027 or a general enquiry, and a relevant engineering focus.
5. Review the company name, work email, subject, message, original resume attachment, and earlier outreach. Check the per-email confirmation and click **Send reviewed email** to send exactly one email. The **Next unsent** button prepares another contact; it never automatically sends to the next one.
6. Use **Block** for opt-outs or contacts who should no longer be emailed; sending to a blocked contact is rejected by the backend.

### Verified profile facts, not manufactured personalization

The draft engine currently uses explainable rules, known graduate year 2028, backend/AI/cloud skills and the applicant's provided GitHub and LinkedIn links. It asks whether the company has an opening; it does not assert a vacancy or imply a recruiter replied. The engine is **not a trained machine-learning model**. Training a custom model requires representative examples, labels, quality checks and privacy authorization; no recruiter contacts or resume bytes are uploaded to an external model in this implementation.

### Sending and privacy protections

- Sending requires the owner's own Gmail OAuth connection **inside the website**, which is separate from the ChatGPT Gmail connector.
- Drafting, importing and viewing contacts never sends messages.
- Each send needs a recipient-specific confirmation and a final explicit browser confirmation.
- The existing limit is at most 10 confirmed sends per day. The backend blocks an email to a recipient already logged as sent in the last 30 days, automated mailboxes and explicit do-not-contact entries.
- The website can deduplicate only against its own database; it **cannot prove** that the same person wasn't emailed through a different Gmail account, a different tool, or a previous outreach workflow. Review external Gmail sent histories yourself.
- Sent email is **not** the same as an employer-confirmed job application.
- The original PDF resume vault is read-only for sending and attaches the stored PDF bytes unchanged. Review the selected attachment before sending.
- Persistent PostgreSQL is required for the private contact list and website Gmail integration. Without it, the app displays a setup error rather than claiming data was saved.
- This workflow intentionally does **not** implement unattended bulk cold emailing, scraping contacts, or bypassing provider sending limits.

## Verification

Run `python -m pytest -q tests` and `node --check static/outreach-studio.js`. GitHub Actions checks the new JavaScript and Python behavior. A green CI run confirms code tests, not the current Render deployment or live Gmail connection.
