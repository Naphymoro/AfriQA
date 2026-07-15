(function () {
  "use strict";

  var APP_CONFIG = {
    appsScriptUrl: "https://script.google.com/macros/s/AKfycbws-NWcwenRceDayw5JcHZLcO2kh-nq-E53U-Ivnb0eyfUYtvMfTRtF_fec6yvhT8Kf/exec",
    storageKey: "afriqa-2026-portal-state"
  };
  var ENDPOINT_PENDING_MESSAGE =
    "Registration is not open yet. The secure application system is being connected by the organising team.";

  var data = window.CONFERENCE_DATA;
  var state = loadState();

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(APP_CONFIG.storageKey)) || {
        account: null,
        registration: {},
        abstract: {},
        support: {},
        uploads: [],
        status: "Draft",
        events: []
      };
    } catch (error) {
      return {
        account: null,
        registration: {},
        abstract: {},
        support: {},
        uploads: [],
        status: "Draft",
        events: []
      };
    }
  }

  function saveState() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
    renderDashboard();
    renderUploads();
  }

  function notify(message) {
    var toast = qs("[data-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(function () {
      toast.hidden = true;
    }, 4200);
  }

  function serialiseForm(form) {
    var formData = new FormData(form);
    var values = {};
    formData.forEach(function (value, key) {
      if (value instanceof File) return;
      values[key] = String(value).trim();
    });
    return values;
  }

  function percentComplete(values, requiredKeys) {
    var filled = requiredKeys.filter(function (key) {
      return values && values[key] && String(values[key]).trim().length > 0;
    }).length;
    return Math.round((filled / requiredKeys.length) * 100);
  }

  function addStatusEvent(title, detail) {
    state.events.unshift({
      title: title,
      detail: detail,
      date: new Date().toLocaleString()
    });
    state.events = state.events.slice(0, 8);
  }

  async function apiRequest(action, payload) {
    if (!isEndpointConfigured()) {
      throw new Error(ENDPOINT_PENDING_MESSAGE);
    }

    var response = await fetch(APP_CONFIG.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: action,
        token: state.sessionToken || "",
        payload: payload
      })
    });

    var result = await response.json();
    if (!result.ok) {
      throw new Error(result.error || "The request could not be completed.");
    }
    return result.result || result;
  }

  function isEndpointConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\//.test(APP_CONFIG.appsScriptUrl);
  }

  function updateEndpointAvailability() {
    var configured = isEndpointConfigured();
    var notice = qs("[data-endpoint-notice]");
    if (notice) {
      notice.textContent = configured
        ? "Secure registration is online. Applicants can create accounts and submit materials."
        : ENDPOINT_PENDING_MESSAGE;
      notice.classList.toggle("is-online", configured);
    }

    qsa("[data-requires-endpoint]").forEach(function (control) {
      control.disabled = !configured;
      control.setAttribute("aria-disabled", String(!configured));
      if (configured) {
        control.removeAttribute("title");
      } else {
        control.title = ENDPOINT_PENDING_MESSAGE;
      }
    });
  }

  function setupNavigation() {
    var header = qs(".site-header");
    var toggle = qs(".nav-toggle");
    var nav = qs(".site-nav");

    window.addEventListener("scroll", function () {
      header.dataset.elevated = window.scrollY > 12 ? "true" : "false";
    });

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        document.body.classList.toggle("nav-open", !isOpen);
      });

      qsa("a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("nav-open");
        });
      });
    }
  }

  function setupCountdown() {
    var root = qs("[data-countdown]");
    if (!root) return;
    var target = new Date(root.dataset.countdown).getTime();
    var dayEl = qs("[data-days]", root);
    var hourEl = qs("[data-hours]", root);
    var minuteEl = qs("[data-minutes]", root);

    function tick() {
      var diff = Math.max(0, target - Date.now());
      var minutes = Math.floor(diff / 60000);
      var days = Math.floor(minutes / 1440);
      var hours = Math.floor((minutes % 1440) / 60);
      var mins = minutes % 60;
      dayEl.textContent = String(days).padStart(3, "0");
      hourEl.textContent = String(hours).padStart(2, "0");
      minuteEl.textContent = String(mins).padStart(2, "0");
    }

    tick();
    window.setInterval(tick, 60000);
  }

  function setupCanvas() {
    var canvas = qs("#quantum-canvas");
    if (!canvas) return;
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ctx = canvas.getContext("2d");
    var points = [];
    var width = 0;
    var height = 0;

    function resize() {
      var ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = Array.from({ length: Math.min(90, Math.floor(width / 18)) }, function (_, index) {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          phase: Math.random() * Math.PI * 2,
          amp: 8 + Math.random() * 26,
          speed: 0.25 + Math.random() * 0.7,
          group: index % 4
        };
      });
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      for (var band = 0; band < 8; band += 1) {
        ctx.beginPath();
        for (var x = 0; x <= width; x += 14) {
          var y =
            height * (0.16 + band * 0.095) +
            Math.sin(x * 0.012 + time * 0.0007 + band) * 18 +
            Math.sin(x * 0.031 - time * 0.00042) * 7;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = band % 2 === 0 ? "rgba(240,183,158,0.16)" : "rgba(129,196,190,0.14)";
        ctx.stroke();
      }

      points.forEach(function (point, index) {
        var px = point.x + Math.sin(time * 0.0002 * point.speed + point.phase) * point.amp;
        var py = point.y + Math.cos(time * 0.00018 * point.speed + point.phase) * point.amp;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + point.group * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = point.group === 0 ? "rgba(245,205,138,0.58)" : "rgba(255,255,255,0.34)";
        ctx.fill();

        for (var j = index + 1; j < points.length; j += 11) {
          var other = points[j];
          var ox = other.x + Math.sin(time * 0.0002 * other.speed + other.phase) * other.amp;
          var oy = other.y + Math.cos(time * 0.00018 * other.speed + other.phase) * other.amp;
          var dx = px - ox;
          var dy = py - oy;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(ox, oy);
            ctx.strokeStyle = "rgba(255,255,255," + (0.11 - distance / 1700).toFixed(3) + ")";
            ctx.stroke();
          }
        }
      });

      if (!prefersReduced) window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.requestAnimationFrame(draw);
  }

  function renderProgramme() {
    var tabs = qs(".day-tabs");
    var list = qs(".programme-list");
    if (!tabs || !list) return;

    function renderDay(dayId) {
      var day = data.programme.find(function (item) {
        return item.id === dayId;
      }) || data.programme[0];

      qsa(".day-tab", tabs).forEach(function (button) {
        button.setAttribute("aria-selected", String(button.dataset.day === day.id));
      });

      list.innerHTML = day.items
        .map(function (item) {
          var speaker = item.speaker ? "<p>" + escapeHtml(item.speaker) + "</p>" : "";
          return (
            '<li class="programme-item">' +
            '<div class="programme-meta"><span>' +
            escapeHtml(item.time) +
            "</span><span>" +
            escapeHtml(day.focus) +
            "</span></div>" +
            "<h3>" +
            escapeHtml(item.title) +
            "</h3>" +
            speaker +
            "</li>"
          );
        })
        .join("");
    }

    tabs.innerHTML = data.programme
      .map(function (day, index) {
        return (
          '<button class="day-tab" type="button" role="tab" data-day="' +
          day.id +
          '" aria-selected="' +
          String(index === 0) +
          '">' +
          day.day +
          " <span>" +
          day.date +
          "</span></button>"
        );
      })
      .join("");

    tabs.addEventListener("click", function (event) {
      var button = event.target.closest(".day-tab");
      if (button) renderDay(button.dataset.day);
    });

    renderDay(data.programme[0].id);
  }

  function renderSpeakers() {
    var root = qs(".speaker-grid");
    if (!root) return;
    root.innerHTML = data.speakers
      .map(function (speaker) {
        var initials = speaker.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(function (part) {
            return part.charAt(0);
          })
          .join("")
          .toUpperCase();
        return (
          '<article class="speaker-card">' +
          '<div class="avatar" aria-hidden="true">' +
          escapeHtml(initials || "Q") +
          "</div>" +
          "<h3>" +
          escapeHtml(speaker.name) +
          "</h3>" +
          "<p>" +
          escapeHtml(speaker.affiliation) +
          "</p>" +
          '<span class="role">' +
          escapeHtml(speaker.role) +
          "</span>" +
          "<p>" +
          escapeHtml(speaker.topic) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function setupPortalTabs() {
    var tabs = qsa(".portal-tab");
    var panels = qsa(".portal-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (item) {
          item.classList.toggle("active", item === tab);
        });
        panels.forEach(function (panel) {
          panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab);
        });
      });
    });
  }

  function setupForms() {
    var accountForm = qs("#account-form");
    var registrationForm = qs("#registration-form");
    var abstractForm = qs("#abstract-form");
    var supportForm = qs("#support-form");
    var uploadForm = qs("#upload-form");

    restoreForm(registrationForm, state.registration);
    restoreForm(abstractForm, state.abstract);
    restoreForm(supportForm, state.support);
    if (state.account) restoreForm(accountForm, state.account);

    accountForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!isEndpointConfigured()) {
        notify(ENDPOINT_PENDING_MESSAGE);
        return;
      }
      var values = serialiseForm(accountForm);
      try {
        var result = await apiRequest("registerUser", values);
        state.account = values;
        state.sessionToken = result.sessionToken || state.sessionToken;
        state.role = result.role || state.role || "applicant";
        state.status = state.status === "Draft" ? "Profile created" : state.status;
        addStatusEvent("Account saved", "Your applicant profile is available in the dashboard.");
        saveState();
        if (state.role === "admin" && window.refreshAdminRows) window.refreshAdminRows();
        notify("Account saved and confirmation email queued.");
      } catch (error) {
        notify(error.message);
      }
    });

    registrationForm.addEventListener("submit", handleNamedSubmit("submitRegistration", registrationForm, "registration", "Registration submitted"));
    abstractForm.addEventListener("submit", handleNamedSubmit("submitAbstract", abstractForm, "abstract", "Abstract submitted"));
    supportForm.addEventListener("submit", handleNamedSubmit("submitScholarship", supportForm, "support", "Travel support request submitted"));

    qsa("[data-save-draft]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!isEndpointConfigured()) {
          notify(ENDPOINT_PENDING_MESSAGE);
          return;
        }
        var form = qs("#" + button.dataset.saveDraft);
        var key = form.id.replace("-form", "");
        if (key === "support") key = "support";
        var values = serialiseForm(form);
        apiRequest("saveDraft", { section: key, values: values })
          .then(function () {
            state[key] = values;
            addStatusEvent("Draft saved", "Draft saved for " + key + ".");
            saveState();
            notify("Draft saved to Google Sheets.");
          })
          .catch(function (error) {
            notify(error.message);
          });
      });
    });

    uploadForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!isEndpointConfigured()) {
        notify(ENDPOINT_PENDING_MESSAGE);
        return;
      }
      var fileInput = qs('input[type="file"]', uploadForm);
      var file = fileInput.files[0];
      if (!file) {
        notify("Choose a file first.");
        return;
      }
      var payload = {
        documentType: qs("[name=documentType]", uploadForm).value,
        file: await fileToPayload(file)
      };
      try {
        await apiRequest("uploadFile", payload);
        state.uploads.push({
          name: file.name,
          size: file.size,
          type: payload.documentType,
          date: new Date().toLocaleString()
        });
        addStatusEvent("File uploaded", payload.documentType + ": " + file.name);
        saveState();
        uploadForm.reset();
        notify("File uploaded to Google Drive.");
      } catch (error) {
        notify(error.message);
      }
    });
  }

  function handleNamedSubmit(action, form, key, successTitle) {
    return async function (event) {
      event.preventDefault();
      if (!isEndpointConfigured()) {
        notify(ENDPOINT_PENDING_MESSAGE);
        return;
      }
      var values = serialiseForm(form);
      try {
        await apiRequest(action, values);
        state[key] = values;
        state.status = "Submitted";
        addStatusEvent(successTitle, "The portal has recorded this submission.");
        saveState();
        notify(successTitle + ".");
      } catch (error) {
        notify(error.message);
      }
    };
  }

  function restoreForm(form, values) {
    if (!form || !values) return;
    Object.keys(values).forEach(function (key) {
      var field = form.elements[key];
      if (field && field.type !== "file") field.value = values[key];
    });
  }

  function renderDashboard() {
    var status = qs("[data-dashboard-status]");
    var auth = qs("[data-auth-state]");
    var timeline = qs("[data-status-timeline]");
    if (status) status.textContent = state.status || "Draft";
    if (auth) {
      auth.textContent = isEndpointConfigured()
        ? state.account
          ? "Signed in"
          : "Registration online"
        : "Registration opening soon";
    }

    setText("[data-progress-account]", percentComplete(state.account || {}, ["name", "email", "institution", "country"]) + "%");
    setText("[data-progress-registration]", percentComplete(state.registration || {}, ["attendanceType", "theme", "sponsorshipCategory", "contribution"]) + "%");
    setText("[data-progress-abstract]", percentComplete(state.abstract || {}, ["title", "format", "abstractText"]) + "%");
    setText("[data-progress-support]", percentComplete(state.support || {}, ["supportType", "motivation"]) + "%");

    if (timeline) {
      var events = state.events.length
        ? state.events
        : [
            {
              title: isEndpointConfigured() ? "Not started" : "Registration opening soon",
              detail: isEndpointConfigured()
                ? "Create an account to begin the production application workflow."
                : "The organising team is connecting the secure submission system.",
              date: ""
            }
          ];
      timeline.innerHTML = events
        .map(function (event) {
          return (
            "<li><strong>" +
            escapeHtml(event.title) +
            "</strong><span>" +
            escapeHtml(event.detail) +
            (event.date ? " - " + escapeHtml(event.date) : "") +
            "</span></li>"
          );
        })
        .join("");
    }
  }

  function renderUploads() {
    var list = qs("[data-uploaded-list]");
    if (!list) return;
    if (!state.uploads.length) {
      list.innerHTML = "<li>No documents uploaded yet.</li>";
      return;
    }
    list.innerHTML = state.uploads
      .map(function (upload) {
        return (
          "<li><strong>" +
          escapeHtml(upload.type) +
          "</strong><br>" +
          escapeHtml(upload.name) +
          " - " +
          Math.round(upload.size / 1024) +
          " KB<br><small>" +
          escapeHtml(upload.date) +
          "</small></li>"
        );
      })
      .join("");
  }

  function setupAdmin() {
    var search = qs("[data-admin-search]");
    var filter = qs("[data-admin-filter]");
    var exportButton = qs("[data-export-csv]");
    var records = [];
    var loadTimer = null;

    function loadRows() {
      apiRequest("adminListApplicants", {
        search: search.value || "",
        status: filter.value || ""
      })
        .then(function (result) {
          records = result.applicants || [];
          renderAdminTable(records, loadRows);
        })
        .catch(function (error) {
          renderAdminMessage(error.message);
        });
    }

    function queueLoad() {
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(loadRows, 250);
    }

    search.addEventListener("input", queueLoad);
    filter.addEventListener("change", loadRows);
    exportButton.addEventListener("click", function () {
      apiRequest("exportCsv", { requestedAt: new Date().toISOString() })
        .then(function (result) {
          var blob = new Blob([result.csv || ""], { type: "text/csv;charset=utf-8" });
          var link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "afriqa-applicant-export.csv";
          link.click();
          URL.revokeObjectURL(link.href);
          notify("CSV export prepared from Google Sheets.");
        })
        .catch(function (error) {
          notify(error.message);
        });
    });

    if (!isEndpointConfigured()) {
      renderAdminMessage("Admin review opens after the secure submission system is connected.");
    } else if (state.sessionToken) {
      loadRows();
    } else {
      renderAdminMessage("Sign in with an admin email to search applicants, update statuses, and export CSV.");
    }
    window.refreshAdminRows = loadRows;
  }

  function setupContactForm() {
    var form = qs("[data-contact-form]");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var values = serialiseForm(form);
      var recipient = form.dataset.contactRecipient || "";
      var subject = "AfriQA 2026 enquiry from " + values.name;
      var body = [
        "Name: " + values.name,
        "Email: " + values.email,
        "",
        values.message
      ].join("\n");

      window.location.href =
        "mailto:" +
        encodeURIComponent(recipient) +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
      notify("Email draft prepared in your mail app.");
    });
  }

  function renderAdminMessage(message) {
    var body = qs("[data-admin-table]");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="7">' + escapeHtml(message) + "</td></tr>";
  }

  function renderAdminTable(records, reload) {
    var body = qs("[data-admin-table]");
    if (!body) return;
    if (!records.length) {
      body.innerHTML = '<tr><td colspan="7">No applicant records returned from Google Sheets.</td></tr>';
      return;
    }
    body.innerHTML = records
      .map(function (record) {
        return (
          "<tr><td>" +
          escapeHtml(record.name) +
          "</td><td>" +
          escapeHtml(record.email) +
          "</td><td>" +
          escapeHtml(record.country) +
          "</td><td>" +
          escapeHtml(record.theme || record.sections || "") +
          "</td><td>" +
          escapeHtml(record.sponsorshipCategory || "") +
          '</td><td><span class="table-status">' +
          escapeHtml(record.status) +
          '</span></td><td><button class="table-action" type="button" data-email="' +
          escapeHtml(record.email) +
          '">Advance status</button></td></tr>'
        );
      })
      .join("");

    qsa(".table-action", body).forEach(function (button) {
      button.addEventListener("click", function () {
        var applicant = records.find(function (record) {
          return record.email === button.dataset.email;
        });
        var next = nextStatus(applicant.status);
        apiRequest("updateStatus", { email: applicant.email, status: next })
          .then(function () {
            notify(applicant.name + " moved to " + next + ".");
            reload();
          })
          .catch(function (error) {
            notify(error.message);
          });
      });
    });
  }

  function nextStatus(status) {
    var statuses = ["Draft", "Submitted", "Under review", "Accepted", "Waitlisted", "Declined"];
    var index = statuses.indexOf(status);
    return statuses[(index + 1) % statuses.length];
  }

  function toCsv(records) {
    var headers = ["name", "email", "country", "theme", "status"];
    var lines = [headers.join(",")];
    records.forEach(function (record) {
      lines.push(
        headers
          .map(function (header) {
            return '"' + String(record[header] || "").replace(/"/g, '""') + '"';
          })
          .join(",")
      );
    });
    return lines.join("\n");
  }

  function fileToPayload(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        resolve({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          data: result.split(",")[1] || ""
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setText(selector, value) {
    var element = qs(selector);
    if (element) element.textContent = value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupNavigation();
    setupCountdown();
    setupCanvas();
    renderProgramme();
    renderSpeakers();
    setupPortalTabs();
    setupForms();
    updateEndpointAvailability();
    renderDashboard();
    renderUploads();
    setupAdmin();
    setupContactForm();
  });
})();
