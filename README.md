# AfriQA 2026 Conference Website

This is a static, fast-loading HTML/CSS/JavaScript conference site for:

**Quantum Science & Technology Across Africa**  
30 November - 4 December 2026  
AIMS Research Innovation Centre, Kigali, Rwanda

## What is included

- Cinematic quantum-inspired homepage
- Logo-only header using AIMS RIC and AfriQA marks, with no typed brand text
- Drawn programme theme map across summer school, research nodes, methods,
  hardware, education, algorithms, and stakeholder translation
- Responsive public sections for about, scientific themes, programme, speakers,
  committee, registration, applications, abstracts, travel support, venue,
  accommodation, sponsors, news, FAQs, and contact
- Production-only application portal front end
- Fully sponsored, partially sponsored, and self sponsored registration options
- Google Apps Script backend package using Google Sheets and Drive
- Admin review UI with search, status changes, and CSV export

## Preview locally

Open `index.html` in a browser. No build step is required.

## Connect the backend

Follow `DEPLOYMENT_GUIDE.md`, deploy the Web App, then paste the Web
App URL into `assets/app.js`:

```js
var APP_CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  storageKey: "afriqa-2026-portal-state"
};
```

The portal is intentionally production-only. If the Apps Script URL is not set,
forms refuse submission instead of writing mock data.

## Google resources created

- Database Sheet: https://docs.google.com/spreadsheets/d/11L63X0S7ulgu8-fAKztx4h8Awn69seew3oD32rVIm6k/edit
- Upload folder: https://drive.google.com/drive/folders/1_wQXNC22JrldZRbxg7t2j5LdWcE4jxc5

## Source material used

- AfriQA public website and event page
- `Schedule - dec 2026 (1).xlsx`
- AfriQA and AIMS Research and Innovation logos supplied with the request
