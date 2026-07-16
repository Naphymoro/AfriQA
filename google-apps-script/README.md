# AfriQA 2026 Google Apps Script Backend

This folder contains the backend for the registration and application portal.
It uses Google Apps Script as the API layer, Google Sheets as the database, and
Google Drive for uploaded files.

## 1. Google resources

These resources have already been created:

| Resource | ID / URL |
| --- | --- |
| Database Sheet | `11L63X0S7ulgu8-fAKztx4h8Awn69seew3oD32rVIm6k` |
| Database URL | https://docs.google.com/spreadsheets/d/11L63X0S7ulgu8-fAKztx4h8Awn69seew3oD32rVIm6k/edit |
| Upload folder | `1_wQXNC22JrldZRbxg7t2j5LdWcE4jxc5` |
| Upload folder URL | https://drive.google.com/drive/folders/1_wQXNC22JrldZRbxg7t2j5LdWcE4jxc5 |

The Sheet has already been seeded with `Users`, `Sessions`, `Applications`,
`Files`, and `AuditLog` tabs.

## 2. Create the Apps Script project

1. Open [script.google.com](https://script.google.com/).
2. Create a new project.
3. Replace the default `Code.gs` with the `Code.gs` in this folder.
4. Add the `appsscript.json` manifest. In Apps Script, enable "Show appsscript.json manifest file" under Project Settings first.

## 3. Install with your Google account

Open Project Settings > Script Properties and set `ADMIN_EMAILS` to your own
Google account email first. Then run `installAfriqaPortal()` once from the Apps
Script editor and approve the requested permissions when Google asks. This uses
your signed-in Google account as the deployer, writes the Sheet and Drive IDs
into Script Properties, and repairs the database tabs.

The required properties are:

| Property | Value |
| --- | --- |
| `SPREADSHEET_ID` | `11L63X0S7ulgu8-fAKztx4h8Awn69seew3oD32rVIm6k` |
| `UPLOAD_FOLDER_ID` | `1_wQXNC22JrldZRbxg7t2j5LdWcE4jxc5` |
| `ADMIN_EMAILS` | Your Google account email, or comma-separated admin emails |
| `PORTAL_URL` | `https://aims-research-and-innovation-centre.github.io/AfriQA/#portal` |
| `MAIL_FROM_ALIAS` | `academicoffice@aimsric.org` if this is a verified Gmail alias for the deploying account |
| `MAIL_REPLY_TO` | `academicoffice@aimsric.org` |
| `MAIL_SENDER_NAME` | `AfriQA 2026 Academic Office` |

## 4. Email sender setup

Google does not allow an Apps Script Web App to spoof any sender address. The
true sender can be `academicoffice@aimsric.org` only if one of these is true:

1. The Apps Script project is owned and deployed by `academicoffice@aimsric.org`.
2. `academicoffice@aimsric.org` is configured in Gmail as a verified "Send mail as"
   alias for the account that deploys the script.

The code checks `GmailApp.getAliases()` and uses `MAIL_FROM_ALIAS` only when
Google reports it as an available alias. Otherwise, mail is still sent with the
sender name `AfriQA 2026 Academic Office` and replies go to `MAIL_REPLY_TO`.

## 5. Initialize the database

`installAfriqaPortal()` calls `setupDatabase()` for you. You can also run
`setupDatabase()` later if you ever need to repair the sheet headers. The script
creates these tabs:

| Sheet | Purpose |
| --- | --- |
| `Users` | Applicant accounts, salted password hashes, profile data, and role |
| `Sessions` | Session tokens and expiry |
| `Applications` | Drafts and submitted registration, abstract, and scholarship records |
| `Files` | Uploaded document metadata and Google Drive URLs |
| `AuditLog` | Admin actions and backend events |

## 6. Deploy the Web App

1. Select Deploy > New deployment.
2. Choose Web app.
3. Execute as: `Me`.
4. Who has access: choose the audience appropriate for the conference. For a public conference portal, use `Anyone`; for an internal test, use your organisation only.
5. Deploy and copy the Web App URL.

## 7. Connect the website

Open `assets/app.js` and paste the Web App URL into:

```js
var APP_CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  siteUrl: "https://aims-research-and-innovation-centre.github.io/AfriQA/",
  storageKey: "afriqa-2026-portal-state"
};
```

The site is production-only. If `appsScriptUrl` is not a deployed Apps Script
Web App URL, portal actions will stop with a configuration error instead of
creating mock data.

## Security notes

- Passwords are stored as salted SHA-256 hashes, not plain text.
- Admin operations require a valid session whose email appears in `ADMIN_EMAILS`.
- Google Apps Script Web Apps should be deployed over HTTPS.
- For high-volume or highly sensitive production use, consider adding Google
  Workspace authentication, reCAPTCHA, stricter rate limits, and a dedicated
  identity provider.
