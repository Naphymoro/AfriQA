/**
 * AfriQA 2026 application portal backend.
 *
 * Deploy as a Google Apps Script Web App:
 * - Execute as: Me
 * - Who has access: Anyone with the link, or your preferred restricted audience
 *
 * Required Script Properties:
 * - SPREADSHEET_ID: Google Sheet database id
 * - UPLOAD_FOLDER_ID: Google Drive folder id for applicant files
 * - ADMIN_EMAILS: comma-separated admin emails
 */

var INSTALL_DEFAULTS = {
  spreadsheetId: "11L63X0S7ulgu8-fAKztx4h8Awn69seew3oD32rVIm6k",
  uploadFolderId: "1_wQXNC22JrldZRbxg7t2j5LdWcE4jxc5"
};

var CONFIG = {
  appName: "AfriQA 2026 Portal",
  spreadsheetId: PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID"),
  uploadFolderId: PropertiesService.getScriptProperties().getProperty("UPLOAD_FOLDER_ID"),
  adminEmails: String(PropertiesService.getScriptProperties().getProperty("ADMIN_EMAILS") || "")
    .split(",")
    .map(function (email) {
      return email.trim().toLowerCase();
    })
    .filter(Boolean),
  sessionHours: 18
};

var SHEETS = {
  users: {
    name: "Users",
    headers: [
      "userId",
      "createdAt",
      "updatedAt",
      "email",
      "name",
      "institution",
      "country",
      "careerStage",
      "passwordSalt",
      "passwordHash",
      "role",
      "status"
    ]
  },
  sessions: {
    name: "Sessions",
    headers: ["token", "userId", "email", "createdAt", "expiresAt", "revoked"]
  },
  applications: {
    name: "Applications",
    headers: [
      "applicationId",
      "userId",
      "email",
      "section",
      "status",
      "createdAt",
      "updatedAt",
      "payloadJson",
      "reviewer",
      "reviewNotes"
    ]
  },
  files: {
    name: "Files",
    headers: [
      "fileId",
      "userId",
      "email",
      "documentType",
      "fileName",
      "mimeType",
      "size",
      "driveFileId",
      "driveUrl",
      "createdAt"
    ]
  },
  audit: {
    name: "AuditLog",
    headers: ["eventId", "createdAt", "actorEmail", "action", "target", "detailsJson"]
  }
};

function installAfriqaPortal() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties(
    {
      SPREADSHEET_ID: INSTALL_DEFAULTS.spreadsheetId,
      UPLOAD_FOLDER_ID: INSTALL_DEFAULTS.uploadFolderId,
      ADMIN_EMAILS: props.getProperty("ADMIN_EMAILS") || ""
    },
    false
  );
  CONFIG.spreadsheetId = INSTALL_DEFAULTS.spreadsheetId;
  CONFIG.uploadFolderId = INSTALL_DEFAULTS.uploadFolderId;
  CONFIG.adminEmails = String(props.getProperty("ADMIN_EMAILS") || "")
    .split(",")
    .map(function (email) {
      return email.trim().toLowerCase();
    })
    .filter(Boolean);
  setupDatabase();
  Logger.log("AfriQA portal database installed.");
  Logger.log("SPREADSHEET_ID: " + INSTALL_DEFAULTS.spreadsheetId);
  Logger.log("UPLOAD_FOLDER_ID: " + INSTALL_DEFAULTS.uploadFolderId);
  Logger.log("ADMIN_EMAILS: " + (props.getProperty("ADMIN_EMAILS") || "Set this manually in Project Settings."));
}

function doGet() {
  return jsonResponse({
    ok: true,
    app: CONFIG.appName,
    status: "online",
    message: "AfriQA 2026 Apps Script endpoint is ready."
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    setupDatabase();
    var request = parseRequest(e);
    var action = request.action;
    var payload = request.payload || {};
    var token = request.token || "";
    var result;

    switch (action) {
      case "registerUser":
        result = registerUser(payload);
        break;
      case "loginUser":
        result = loginUser(payload);
        break;
      case "saveDraft":
        result = saveDraft(token, payload);
        break;
      case "submitRegistration":
        result = submitSection(token, "registration", payload);
        break;
      case "submitAbstract":
        result = submitSection(token, "abstract", payload);
        break;
      case "submitScholarship":
        result = submitSection(token, "scholarship", payload);
        break;
      case "uploadFile":
        result = uploadFile(token, payload);
        break;
      case "adminListApplicants":
        result = adminListApplicants(token, payload);
        break;
      case "updateStatus":
        result = updateStatus(token, payload);
        break;
      case "exportCsv":
        result = exportCsv(token, payload);
        break;
      default:
        throw new Error("Unknown action: " + action);
    }

    return jsonResponse({ ok: true, result: result });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function setupDatabase() {
  var spreadsheet = getSpreadsheet();
  Object.keys(SHEETS).forEach(function (key) {
    var spec = SHEETS[key];
    var sheet = spreadsheet.getSheetByName(spec.name) || spreadsheet.insertSheet(spec.name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(spec.headers);
      sheet.setFrozenRows(1);
    }
    var currentHeaders = sheet.getRange(1, 1, 1, spec.headers.length).getValues()[0];
    var shouldRewrite = spec.headers.some(function (header, index) {
      return currentHeaders[index] !== header;
    });
    if (shouldRewrite) {
      sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function registerUser(payload) {
  requireFields(payload, ["name", "email", "password", "institution", "country", "careerStage"]);
  var email = normaliseEmail(payload.email);
  var users = getSheet("users");
  var records = readRecords(users, SHEETS.users.headers);
  var now = nowIso();
  var existing = findBy(records, "email", email);
  var salt = Utilities.getUuid();
  var hash = hashPassword(payload.password, salt);
  var role = CONFIG.adminEmails.indexOf(email) >= 0 ? "admin" : "applicant";
  var userId = existing ? existing.userId : "usr_" + Utilities.getUuid();

  var row = [
    userId,
    existing ? existing.createdAt : now,
    now,
    email,
    clean(payload.name, 160),
    clean(payload.institution, 220),
    clean(payload.country, 120),
    clean(payload.careerStage, 120),
    salt,
    hash,
    role,
    "Profile created"
  ];

  upsertBy(users, SHEETS.users.headers, "email", email, row);
  audit(email, "registerUser", userId, { role: role });
  var session = createSession(userId, email);
  sendConfirmation(email, "AfriQA 2026 portal account", "Your AfriQA 2026 portal account has been created or updated.");
  return { userId: userId, email: email, role: role, sessionToken: session.token };
}

function loginUser(payload) {
  requireFields(payload, ["email", "password"]);
  var email = normaliseEmail(payload.email);
  var users = readRecords(getSheet("users"), SHEETS.users.headers);
  var user = findBy(users, "email", email);
  if (!user) throw new Error("No account exists for that email.");
  if (hashPassword(payload.password, user.passwordSalt) !== user.passwordHash) {
    throw new Error("Invalid email or password.");
  }
  var session = createSession(user.userId, email);
  audit(email, "loginUser", user.userId, {});
  return { userId: user.userId, email: email, role: user.role, sessionToken: session.token };
}

function saveDraft(token, payload) {
  var user = requireUser(token);
  var section = clean(payload.section || "draft", 80);
  var values = payload.values || {};
  var result = writeApplication(user, section, "Draft", values);
  audit(user.email, "saveDraft", result.applicationId, { section: section });
  return result;
}

function submitSection(token, section, payload) {
  var user = requireUser(token);
  validateSection(section, payload);
  var result = writeApplication(user, section, "Submitted", payload);
  audit(user.email, "submitSection", result.applicationId, { section: section });
  sendConfirmation(user.email, "AfriQA 2026 " + section + " submitted", "Your " + section + " submission has been received.");
  return result;
}

function writeApplication(user, section, status, payload) {
  var sheet = getSheet("applications");
  var records = readRecords(sheet, SHEETS.applications.headers);
  var existing = records.find(function (record) {
    return record.userId === user.userId && record.section === section;
  });
  var now = nowIso();
  var applicationId = existing ? existing.applicationId : "app_" + Utilities.getUuid();
  var row = [
    applicationId,
    user.userId,
    user.email,
    section,
    status,
    existing ? existing.createdAt : now,
    now,
    JSON.stringify(safePayload(payload)),
    existing ? existing.reviewer : "",
    existing ? existing.reviewNotes : ""
  ];
  upsertBy(sheet, SHEETS.applications.headers, "applicationId", applicationId, row);
  return { applicationId: applicationId, status: status, section: section };
}

function uploadFile(token, payload) {
  var user = requireUser(token);
  requireFields(payload, ["documentType", "file"]);
  if (!CONFIG.uploadFolderId) throw new Error("UPLOAD_FOLDER_ID script property is not configured.");
  var file = payload.file;
  requireFields(file, ["name", "mimeType", "data"]);
  if (Number(file.size || 0) > 10 * 1024 * 1024) throw new Error("File exceeds 10 MB limit.");

  var folder = DriveApp.getFolderById(CONFIG.uploadFolderId);
  var safeName = user.email.replace(/[^a-z0-9@._-]/gi, "_") + "_" + Date.now() + "_" + cleanFileName(file.name);
  var blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.mimeType, safeName);
  var driveFile = folder.createFile(blob);
  var now = nowIso();
  var fileId = "fil_" + Utilities.getUuid();
  var row = [
    fileId,
    user.userId,
    user.email,
    clean(payload.documentType, 120),
    clean(file.name, 240),
    clean(file.mimeType, 120),
    Number(file.size || 0),
    driveFile.getId(),
    driveFile.getUrl(),
    now
  ];
  getSheet("files").appendRow(row);
  audit(user.email, "uploadFile", fileId, { documentType: payload.documentType, fileName: file.name });
  return { fileId: fileId, driveFileId: driveFile.getId(), driveUrl: driveFile.getUrl() };
}

function adminListApplicants(token, payload) {
  var user = requireAdmin(token);
  var users = readRecords(getSheet("users"), SHEETS.users.headers);
  var apps = readRecords(getSheet("applications"), SHEETS.applications.headers);
  var term = String((payload && payload.search) || "").toLowerCase();
  var status = String((payload && payload.status) || "");
  var rows = users
    .filter(function (record) {
      return record.role !== "admin";
    })
    .map(function (record) {
      var applicantApps = apps.filter(function (app) {
        return app.userId === record.userId;
      });
      var registration = applicantApps.find(function (app) {
        return app.section === "registration";
      });
      var abstract = applicantApps.find(function (app) {
        return app.section === "abstract";
      });
      var scholarship = applicantApps.find(function (app) {
        return app.section === "scholarship";
      });
      var registrationPayload = parsePayloadJson(registration && registration.payloadJson);
      var abstractPayload = parsePayloadJson(abstract && abstract.payloadJson);
      var scholarshipPayload = parsePayloadJson(scholarship && scholarship.payloadJson);
      var latestStatus = applicantApps.length ? applicantApps[applicantApps.length - 1].status : record.status;
      return {
        userId: record.userId,
        email: record.email,
        name: record.name,
        country: record.country,
        institution: record.institution,
        careerStage: record.careerStage,
        theme: registrationPayload.theme || abstractPayload.keywords || "",
        sponsorshipCategory: registrationPayload.sponsorshipCategory || scholarshipPayload.supportType || "",
        status: latestStatus,
        sections: applicantApps.map(function (app) {
          return app.section;
        }).join(", ")
      };
    })
    .filter(function (record) {
      var text = JSON.stringify(record).toLowerCase();
      return (!term || text.indexOf(term) !== -1) && (!status || record.status === status);
    });
  audit(user.email, "adminListApplicants", "Applicants", { count: rows.length });
  return { applicants: rows };
}

function updateStatus(token, payload) {
  var admin = requireAdmin(token);
  requireFields(payload, ["email", "status"]);
  var email = normaliseEmail(payload.email);
  var status = clean(payload.status, 80);
  var appsSheet = getSheet("applications");
  var records = readRecords(appsSheet, SHEETS.applications.headers);
  records.forEach(function (record, index) {
    if (record.email === email) {
      appsSheet.getRange(index + 2, SHEETS.applications.headers.indexOf("status") + 1).setValue(status);
      appsSheet.getRange(index + 2, SHEETS.applications.headers.indexOf("reviewer") + 1).setValue(admin.email);
      appsSheet.getRange(index + 2, SHEETS.applications.headers.indexOf("updatedAt") + 1).setValue(nowIso());
    }
  });
  audit(admin.email, "updateStatus", email, { status: status });
  sendConfirmation(email, "AfriQA 2026 application status update", "Your application status has been updated to: " + status + ".");
  return { email: email, status: status };
}

function exportCsv(token) {
  var admin = requireAdmin(token);
  var applicants = adminListApplicants(token, {}).applicants;
  var headers = [
    "userId",
    "email",
    "name",
    "country",
    "institution",
    "careerStage",
    "theme",
    "sponsorshipCategory",
    "status",
    "sections"
  ];
  var csv = [headers.join(",")]
    .concat(
      applicants.map(function (record) {
        return headers
          .map(function (header) {
            return '"' + String(record[header] || "").replace(/"/g, '""') + '"';
          })
          .join(",");
      })
    )
    .join("\n");
  audit(admin.email, "exportCsv", "Applicants", { count: applicants.length });
  return { csv: csv };
}

function requireUser(token) {
  if (!token) throw new Error("Authentication token is required.");
  var sessions = readRecords(getSheet("sessions"), SHEETS.sessions.headers);
  var session = findBy(sessions, "token", token);
  if (!session || String(session.revoked).toLowerCase() === "true") throw new Error("Session is invalid.");
  if (new Date(session.expiresAt).getTime() < Date.now()) throw new Error("Session has expired.");
  return { userId: session.userId, email: session.email };
}

function requireAdmin(token) {
  var session = requireUser(token);
  if (CONFIG.adminEmails.indexOf(session.email.toLowerCase()) < 0) {
    throw new Error("Admin access is required.");
  }
  return session;
}

function createSession(userId, email) {
  var token = "ses_" + Utilities.getUuid() + "_" + Utilities.getUuid();
  var now = new Date();
  var expires = new Date(now.getTime() + CONFIG.sessionHours * 60 * 60 * 1000);
  getSheet("sessions").appendRow([token, userId, email, now.toISOString(), expires.toISOString(), false]);
  return { token: token, expiresAt: expires.toISOString() };
}

function validateSection(section, payload) {
  if (section === "registration") {
    requireFields(payload, ["attendanceType", "theme", "sponsorshipCategory"]);
  }
  if (section === "abstract") {
    requireFields(payload, ["title", "format", "abstractText"]);
    if (String(payload.abstractText).length > 2500) throw new Error("Abstract exceeds 2500 characters.");
  }
  if (section === "scholarship") {
    requireFields(payload, ["supportType", "motivation"]);
  }
}

function parsePayloadJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Empty request.");
  return JSON.parse(e.postData.contents);
}

function getSpreadsheet() {
  if (!CONFIG.spreadsheetId) throw new Error("SPREADSHEET_ID script property is not configured.");
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function getSheet(key) {
  return getSpreadsheet().getSheetByName(SHEETS[key].name);
}

function readRecords(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    var record = {};
    headers.forEach(function (header, index) {
      record[header] = row[index];
    });
    return record;
  });
}

function upsertBy(sheet, headers, key, keyValue, row) {
  var records = readRecords(sheet, headers);
  var keyIndex = headers.indexOf(key);
  var matchIndex = -1;
  records.forEach(function (record, index) {
    if (record[key] === keyValue) matchIndex = index;
  });
  if (matchIndex >= 0) {
    sheet.getRange(matchIndex + 2, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function findBy(records, key, value) {
  return records.find(function (record) {
    return record[key] === value;
  });
}

function requireFields(payload, fields) {
  fields.forEach(function (field) {
    if (payload == null || payload[field] == null || String(payload[field]).trim() === "") {
      throw new Error("Missing required field: " + field);
    }
  });
}

function normaliseEmail(email) {
  var value = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Invalid email address.");
  return value;
}

function hashPassword(password, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + "::" + password);
  return Utilities.base64Encode(bytes);
}

function safePayload(payload) {
  var output = {};
  Object.keys(payload || {}).forEach(function (key) {
    output[key] = clean(payload[key], 5000);
  });
  return output;
}

function clean(value, maxLength) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLength || 1000);
}

function cleanFileName(name) {
  return clean(name, 220).replace(/[^a-z0-9._-]/gi, "_");
}

function sendConfirmation(email, subject, body) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body + "\n\n" + CONFIG.appName
    });
  } catch (error) {
    audit("system", "emailFailed", email, { subject: subject, error: String(error) });
  }
}

function audit(actorEmail, action, target, details) {
  try {
    getSheet("audit").appendRow([
      "evt_" + Utilities.getUuid(),
      nowIso(),
      actorEmail || "system",
      action,
      target || "",
      JSON.stringify(details || {})
    ]);
  } catch (error) {
    // Avoid blocking user flows on audit logging failures.
  }
}

function nowIso() {
  return new Date().toISOString();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
