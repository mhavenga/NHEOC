(function() {
  if (window.__mhNotifLoaded) {
    return;
  }
  window.__mhNotifLoaded = true;

  var mhNotificationConfig = {
    connection: {
      vantiqServer: "localhost:8080",
      accessToken: "Roy54DG1pOWktn125PuRTX_-nvPuFc414AXTC81XIN8=",
      restEndpoint: "/api/v1/resources/custom/jp.co.vantiq.notifications",
      websocket: {
        enabled: true,
        eventPath: "/services/jp.co.vantiq.UIEventBridger/notificationOut",
        reconnect: true,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5
      }
    },

    autoRefresh: {
      enabled: true,
      interval: 30000
    },

    display: {
      maxRows: 1000,
      messagePreviewLength: 140
    },

    attentionRules: {
      enabled: false,
      openOnly: true,
      minLevel: 3
    },

    columns: [
      { field: "createdAt", label: "Date", sortable: true, type: "datetime" },
      { field: "metadata.recordnumber", label: "Incident", sortable: true, type: "text" },
      { field: "notificationType", label: "Type", sortable: true, type: "badge" },
//      { field: "incident_level", label: "Level", sortable: true, type: "level" },
//      { field: "metadata.status", label: "Incident Status", sortable: true, type: "status" },
      { field: "metadata.region", label: "Region", sortable: true, type: "text" },
      { field: "metadata.incident_type", label: "Incident Type", sortable: true, type: "text" },
      { field: "metadata.incident_subtype", label: "Sub Type", sortable: true, type: "text" },
      { field: "messageBody", label: "Message", sortable: false, type: "message" }
    ]
  };

  var notifications = [];
  var filteredNotifications = [];
  var ws = null;
  var reconnectAttempts = 0;
  var authenticated = false;
  var notifSortColumn = "createdAt";
  var notifSortDirection = "desc";
  var initialized = false;

  function waitForRoot() {
    var root = document.getElementById("mhNotificationLogRoot");
    if (!root) {
      setTimeout(waitForRoot, 300);
      return;
    }

    if (initialized) {
      return;
    }

    initialized = true;
    init();
  }

  function init() {
    exposeApi();
    buildNotificationTableHeader();
    attachEvents();
    loadFromRest();

    if (mhNotificationConfig.autoRefresh && mhNotificationConfig.autoRefresh.enabled){
      setInterval(loadFromRest,mhNotificationConfig.autoRefresh.interval);
    }

    if (mhNotificationConfig.connection.websocket.enabled) {
      connectWebSocket();
    }
  }

  function exposeApi() {
    window.mhNotificationApi = {
      loadData: function(json) {
        notifications = Array.isArray(json) ? json : [];
        sortNotificationsByCurrent();
        trimRows();
        applyFilters();
      },

      addNotification: function(notification) {
        addNotification(notification);
      },

      reconnect: function() {
        connectWebSocket();
      },

      refresh: function() {
        loadFromRest();
      }
    };
  }

  function attachEvents() {
    var typeFilter = document.getElementById("mhNotifTypeFilter");
    var statusFilter = document.getElementById("mhNotifStatusFilter");
    var levelFilter = document.getElementById("mhNotifLevelFilter");
    var searchInput = document.getElementById("mhNotifSearchInput");
    var clearBtn = document.getElementById("mhNotifClearFiltersBtn");
    var refreshBtn = document.getElementById("mhNotifRefreshBtn");
    var closeBtn = document.getElementById("mhNotifCloseModal");
    var modal = document.getElementById("mhNotifDetailModal");

    if (typeFilter) typeFilter.onchange = applyFilters;
    if (statusFilter) statusFilter.onchange = applyFilters;
    if (levelFilter) levelFilter.onchange = applyFilters;
    if (searchInput) searchInput.oninput = applyFilters;

    if (clearBtn) {
      clearBtn.onclick = function() {
        if (typeFilter) typeFilter.value = "";
        if (statusFilter) statusFilter.value = "";
        if (levelFilter) levelFilter.value = "";
        if (searchInput) searchInput.value = "";
        applyFilters();
      };
    }

    if (refreshBtn) {
      refreshBtn.onclick = loadFromRest;
    }

    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }

    window.onclick = function(e) {
      if (e.target === modal) {
        closeModal();
      }
    };
  }

  function buildNotificationTableHeader() {
    var thead = document.getElementById("mhNotificationTableHead");
    var tr;
    var i;
    var col;
    var th;
    var icon;

    if (!thead) return;

    tr = document.createElement("tr");

    for (i = 0; i < mhNotificationConfig.columns.length; i += 1) {
      col = mhNotificationConfig.columns[i];
      th = document.createElement("th");
      th.textContent = col.label;

      if (col.sortable) {
        th.className = "mh-notificationlog__sortable";
        th.setAttribute("data-sort", col.field);

        icon = document.createElement("span");
        icon.className = "mh-notificationlog__sort-icon";
        icon.textContent = "⇅";

        th.appendChild(document.createTextNode(" "));
        th.appendChild(icon);
        th.onclick = makeNotificationSortHandler(col.field);
      }

      tr.appendChild(th);
    }

    thead.innerHTML = "";
    thead.appendChild(tr);
    updateNotificationSortIndicators();
  }

  function makeNotificationSortHandler(field) {
    return function() {
      sortNotificationsBy(field);
    };
  }

  function loadFromRest() {
    var url =
      "http://" +
      mhNotificationConfig.connection.vantiqServer +
      mhNotificationConfig.connection.restEndpoint;

    hideError();

    fetch(url, {
      method: "GET",
      headers: getAuthHeader()
    })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        notifications = Array.isArray(data) ? data : [];
        sortNotificationsByCurrent();
        trimRows();
        applyFilters();
        updateLastUpdated();
      })
      .catch(function(err) {
        showError("Notification REST load failed: " + err.message);
      });
  }

  function connectWebSocket() {
    var wsUrl =
      "wss://" +
      mhNotificationConfig.connection.vantiqServer +
      "/api/v1/wsock/websocket";

    setConnectionState("Connecting...", false);

    ws = new WebSocket(wsUrl);
    authenticated = false;

    ws.onopen = function() {
      setConnectionState("Authenticating...", false);

      ws.send(JSON.stringify({
        op: "validate",
        resourceName: "system.credentials",
        object: mhNotificationConfig.connection.accessToken,
        parameters: {
          requestId: "validateNotifications"
        }
      }));
    };

    ws.onmessage = function(event) {
      readSocketMessage(event, function(text) {
        var data;

        try {
          data = JSON.parse(text);
        } catch (e) {
          return;
        }

        handleSocketMessage(data);
      });
    };

    ws.onclose = function() {
      authenticated = false;
      setConnectionState("Disconnected", false);

      if (
        mhNotificationConfig.connection.websocket.reconnect &&
        reconnectAttempts < mhNotificationConfig.connection.websocket.maxReconnectAttempts
      ) {
        reconnectAttempts += 1;

        setTimeout(function() {
          connectWebSocket();
        }, mhNotificationConfig.connection.websocket.reconnectDelay);
      }
    };

    ws.onerror = function() {
      setConnectionState("Connection error", false);
    };
  }

  function handleSocketMessage(data) {
    var requestId = "";

    if (data.headers && data.headers["X-Request-Id"]) {
      requestId = data.headers["X-Request-Id"];
    }

    if (requestId === "validateNotifications") {
      if (data.status === 200) {
        authenticated = true;
        reconnectAttempts = 0;
        setConnectionState("Connected", true);
        subscribeToNotificationEvents();
      } else {
        setConnectionState("Auth failed", false);
      }
      return;
    }

    if (data.status === 100 && data.body && data.body.value) {
      addNotification(data.body.value);
    }
  }

  function subscribeToNotificationEvents() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify({
      op: "subscribe",
      resourceName: "events",
      resourceId: mhNotificationConfig.connection.websocket.eventPath,
      parameters: {
        requestId: "subscribe_notifications"
      }
    }));
  }

  function addNotification(notification) {
    if (!notification) {
      return;
    }

    notifications.unshift(notification);
    trimRows();
    applyFilters();
    updateLastUpdated();
  }

  function trimRows() {
    if (
      mhNotificationConfig.display.maxRows &&
      notifications.length > mhNotificationConfig.display.maxRows
    ) {
      notifications = notifications.slice(0, mhNotificationConfig.display.maxRows);
    }
  }

  function sortNotificationsByCurrent() {
    notifications.sort(function(a, b) {
      var av = getNotificationSortValue(a, notifSortColumn);
      var bv = getNotificationSortValue(b, notifSortColumn);

      if (av < bv) return notifSortDirection === "asc" ? -1 : 1;
      if (av > bv) return notifSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  function sortNotificationsBy(field) {
    if (notifSortColumn === field) {
      notifSortDirection = notifSortDirection === "asc" ? "desc" : "asc";
    } else {
      notifSortColumn = field;
      notifSortDirection = "asc";
    }

    sortNotificationsByCurrent();
    applyFilters();
  }

  function applyFilters() {
    var typeFilter = getValue("mhNotifTypeFilter");
    var statusFilter = getValue("mhNotifStatusFilter");
    var levelFilter = getValue("mhNotifLevelFilter");
    var search = getValue("mhNotifSearchInput").toLowerCase();

    filteredNotifications = notifications.filter(function(n) {
//      console.log("notifications.filter");
//      console.log(n);
      var level = String(getLevel(n));
      var incidentOpen = isOpenNotification(n);
      var text;

      if (typeFilter && String(n.notificationType) !== typeFilter) return false;
      if (levelFilter && level !== levelFilter) return false;
      if (statusFilter === "open" && !incidentOpen) return false;
      if (statusFilter === "closed" && incidentOpen) return false;

      if (search) {
        text = JSON.stringify(n).toLowerCase();
       // console.log("Text == " + text);
        if (text.indexOf(search) === -1) return false;
      }

      return true;
    });

    render();
  }

  function render() {
    renderStats();
    renderTable();
    updateNotificationSortIndicators();
  }

  function renderStats() {
    var total = notifications.length;
    var open = 0;
    var closed = 0;
    var i;

    for (i = 0; i < notifications.length; i += 1) {
      if (isOpenNotification(notifications[i])) {
        open += 1;
      } else {
        closed += 1;
      }
    }

    setText("mhNotifTotal", total);
    setText("mhNotifOpen", open);
    setText("mhNotifClosed", closed);
    setText("mhNotifShowing", filteredNotifications.length);
  }

  function renderTable() {
    var tbody = document.getElementById("mhNotificationTableBody");
    var i;
    var j;
    var n;
    var tr;
    var td;
    var col;

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!filteredNotifications.length) {
      tr = document.createElement("tr");
      td = document.createElement("td");
      td.colSpan = mhNotificationConfig.columns.length;
      td.style.textAlign = "center";
      td.style.color = "#64748b";
      td.textContent = "No notifications to display";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (i = 0; i < filteredNotifications.length; i += 1) {
      n = filteredNotifications[i];

      tr = document.createElement("tr");
      tr.className = "mh-notificationlog__row";

      if (isNotificationNeedingAttention(n)) {
        tr.className += " mh-notificationlog__row-attention";
      }

      for (j = 0; j < mhNotificationConfig.columns.length; j += 1) {
        col = mhNotificationConfig.columns[j];
        td = document.createElement("td");
        td.innerHTML = formatNotificationCell(n, col);
        tr.appendChild(td);
      }

      tr.onclick = makeDetailHandler(n);
      tbody.appendChild(tr);
    }
  }

  function formatNotificationCell(n, col) {
    var value = getNestedValue(n, col.field);

    if (col.type === "datetime") {
      return esc(formatDate(value));
    }

    if (col.type === "level") {
      return levelBadge(getLevel(n));
    }

    if (col.type === "status") {
      return statusBadge(getNotificationDisplayStatus(n));
    }

    if (col.type === "badge") {
      return typeBadge(value);
    }

    if (col.type === "message") {
      return '<span class="mh-notificationlog__message-preview">' +
        esc(truncate(stripHtml(value || ""), mhNotificationConfig.display.messagePreviewLength)) +
        "</span>";
    }

    return esc(value || "");
  }

  function makeDetailHandler(notification) {
    return function() {
      showNotificationDetails(notification);

      window.mhNotificationSelected = notification;

      if (typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("mhNotificationSelected", {
          detail: notification
        }));
      }
    };
  }

  function showNotificationDetails(n) {
    var modal = document.getElementById("mhNotifDetailModal");
    var content = document.getElementById("mhNotifDetailContent");

    if (!modal || !content) return;

    content.innerHTML =
      '<div class="mh-notificationlog__detail-section">' +
        '<h3>Notification</h3>' +
        detailRow("ID", n.id) +
        detailRow("Created At", formatDate(n.createdAt)) +
        detailRow("Incident ID", n.incidentId) +
        detailRow("Notification Type", n.notificationType) +
        detailRow("Level", getLevel(n)) +
        detailRow("Status", getNotificationDisplayStatus(n)) +
      '</div>' +

      '<div class="mh-notificationlog__detail-section">' +
        '<h3>Message</h3>' +
        '<div class="mh-notificationlog__detail-message">' + safeMessageBody(n.messageBody) + '</div>' +
      '</div>' +

      '<div class="mh-notificationlog__detail-section">' +
        '<h3>Incident Metadata</h3>' +
        detailRow("Region", getNestedValue(n, "metadata.region")) +
        detailRow("Incident Type", getNestedValue(n, "metadata.incident_type")) +
        detailRow("Incident Subtype", getNestedValue(n, "metadata.incident_subtype")) +
        detailRow("Location", getNestedValue(n, "metadata.IncidentLocation") || getNestedValue(n, "metadata.incidentLocation")) +
        detailRow("Facility", getNestedValue(n, "metadata.HealthCareFacilityName")) +
        detailRow("Casualties", getNestedValue(n, "metadata.casualties")) +
        detailRow("Record Number", getNestedValue(n, "metadata.recordnumber")) +
      '</div>' +

      '<div class="mh-notificationlog__detail-section">' +
        '<h3>Full JSON</h3>' +
        '<pre class="mh-notificationlog__detail-json">' + esc(JSON.stringify(n, null, 2)) + '</pre>' +
      '</div>';

    modal.style.display = "block";
  }

  function closeModal() {
    var modal = document.getElementById("mhNotifDetailModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function detailRow(label, value) {
    if (value === null || value === undefined || value === "") {
      value = "";
    }

    return '<div class="mh-notificationlog__detail-row"><strong>' +
      esc(label) +
      ":</strong> " +
      esc(value) +
      "</div>";
  }

  function getNestedValue(obj, path) {
    var parts;
    var value;
    var i;

    if (!obj || !path) return "";

    parts = String(path).split(".");
    value = obj;

    for (i = 0; i < parts.length; i += 1) {
      if (value === null || value === undefined) {
        return "";
      }
      value = value[parts[i]];
    }

    return value === null || value === undefined ? "" : value;
  }

  function getNotificationSortValue(n, field) {
    var value = getNestedValue(n, field);

    if (field === "createdAt" || field === "occurred_at") {
      return new Date(value);
    }

    if (field === "incident_level") {
      return Number(getLevel(n)) || 0;
    }

    return String(value || "").toLowerCase();
  }

  function updateNotificationSortIndicators() {
    var headers = document.querySelectorAll("#mhNotificationTable th.mh-notificationlog__sortable");
    var i;
    var th;
    var field;

    for (i = 0; i < headers.length; i += 1) {
      th = headers[i];
      th.classList.remove("mh-notificationlog__sortable--asc");
      th.classList.remove("mh-notificationlog__sortable--desc");

      field = th.getAttribute("data-sort");

      if (field === notifSortColumn) {
        th.classList.add(
          notifSortDirection === "asc"
            ? "mh-notificationlog__sortable--asc"
            : "mh-notificationlog__sortable--desc"
        );
      }
    }
  }

  function getLevel(n) {
    if (n.incident_level) {
      return n.incident_level;
    }

    if (n.metadata && n.metadata.incident_level) {
      if (typeof n.metadata.incident_level === "object") {
        return n.metadata.incident_level.level;
      }
      return n.metadata.incident_level;
    }

    return "";
  }

  function isOpenNotification(n) {
    var status;

    if (n.metadata && n.metadata.is_open === true) return true;
    if (n.metadata && n.metadata.is_open === false) return false;

    status = getNotificationDisplayStatus(n).toLowerCase();

    return status.indexOf("open") >= 0 || status.indexOf("مفتوح") >= 0;
  }

  function getNotificationDisplayStatus(n) {
    if (n.metadata && n.metadata.status) {
      return n.metadata.status;
    }

    if (n.metadata && n.metadata.IncidentStatus) {
      return n.metadata.IncidentStatus;
    }

    return n.status || "";
  }

  function isNotificationNeedingAttention(n) {
    var rules = mhNotificationConfig.attentionRules;
    var level = Number(getLevel(n)) || 0;

    if (!rules || !rules.enabled) return false;
    if (rules.openOnly && !isOpenNotification(n)) return false;

    return level >= rules.minLevel;
  }

  function typeBadge(value) {
    var text = String(value || "");
    var cls = "mh-notificationlog__badge";
    var lower = text.toLowerCase();

    if (lower === "new") cls += " mh-notificationlog__badge--new";
    else if (lower === "closed") cls += " mh-notificationlog__badge--closed";
    else if (lower === "mitigation") cls += " mh-notificationlog__badge--mitigation";

    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  function levelBadge(level) {
    var n = Number(level) || 0;
    var cls = "mh-notificationlog__level";

    if (n >= 5) cls += " mh-notificationlog__level--critical";
    else if (n >= 4) cls += " mh-notificationlog__level--high";
    else if (n >= 2) cls += " mh-notificationlog__level--medium";
    else cls += " mh-notificationlog__level--low";

    return '<span class="' + cls + '">' + esc(level) + "</span>";
  }

  function statusBadge(status) {
    var text = String(status || "");
    var lower = text.toLowerCase();
    var cls = "mh-notificationlog__status";

    if (lower.indexOf("open") >= 0 || text.indexOf("مفتوح") >= 0) {
      cls += " mh-notificationlog__status--open";
    } else if (lower.indexOf("closed") >= 0 || text.indexOf("مغلق") >= 0) {
      cls += " mh-notificationlog__status--closed";
    }

    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  function safeMessageBody(value) {
    var html = String(value || "");

    html = html
      .replace(/<script/gi, "&lt;script")
      .replace(/<\/script>/gi, "&lt;/script&gt;");

    return html.replace(/\n/g, "<br>");
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ");
  }

  function truncate(value, max) {
    value = String(value || "");
    if (!max || value.length <= max) return value;
    return value.substring(0, max) + "...";
  }

  function getAuthHeader() {
    return {
      "Authorization": "Bearer " + mhNotificationConfig.connection.accessToken,
      "Content-Type": "application/json"
    };
  }

  function readSocketMessage(event, callback) {
    if (typeof event.data === "string") {
      callback(event.data);
      return;
    }

    if (event.data && typeof event.data.text === "function") {
      event.data.text().then(function(text) {
        callback(text);
      });
      return;
    }

    callback(String(event.data));
  }

  function formatDate(ts) {
    if (!ts) {
      return "";
    }

    return new Date(ts).toLocaleString();
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  function getValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  function updateLastUpdated() {
    setText("mhNotifLastUpdated", new Date().toLocaleTimeString());
  }

  function setConnectionState(text, connected) {
    var dot = document.getElementById("mhNotifStatusDot");
    var label = document.getElementById("mhNotifConnectionText");

    if (label) {
      label.textContent = text;
    }

    if (dot) {
      if (connected) {
        dot.classList.add("mh-notificationlog__status-dot--connected");
      } else {
        dot.classList.remove("mh-notificationlog__status-dot--connected");
      }
    }
  }

  function showError(message) {
    var el = document.getElementById("mhNotifErrorMessage");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  }

  function hideError() {
    var el = document.getElementById("mhNotifErrorMessage");
    if (el) {
      el.style.display = "none";
    }
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function logout(){
    client.confirmCustom("Are you sure you want to exit","Yes","No",function(clicked)
    {
        //
        //  "clicked" will have a value of "Yes", "No" or "Cancel" depending on which 
        //  button in the dialog was clicked.
        //
        if (clicked == "Yes"){
          client.logout();    
        }
    });  
  }


  waitForRoot();
})();