(function() {
  if (window.__mhIncidentLog1Loaded) {
    return;
  }
  window.__mhIncidentLog1Loaded = true;

  /* =========================
     IncidentLog1 Config
     ========================= */
  var mhIncidentLog1Config = {
    connection: {
      vantiqServer: "localhost:8080",
      accessToken: "Roy54DG1pOWktn125PuRTX_-nvPuFc414AXTC81XIN8=",
      restEndpoint: "/api/v1/resources/custom/jp.co.vantiq.incident_statuses"
    },

    attentionRules: {
      enabled: true,
      minlevel: 5,
      maxAgeMinutes: 0,
      subType: "Electricity outages - انقطاع الكهرباء"
    },

    api: {
      timeout: 30000,
      retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000
      }
    },

    buttonRules: {
      minLevel: 0
    },

    autoRefresh: {
      enabled: true,
      interval: 30000
    },

    highlight: {
      duration: 2000,
      color: "#FFD700"
    },

    display: {
      dateFormat: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      },
      maxIncidents: -1
    },

    columns: [
      { field: "recordnumber", label: "Incident ID", sortable: true, type: "text" },
      { field: "region", label: "Region", sortable: true, type: "text" },
      { field: "IncidentDateTime", label: "Occurred At", sortable: true, type: "datetime" },
      { field: "incident_type", label: "Type", sortable: true, type: "text" },
      { field: "incident_subtype", label: "Sub Type", sortable: true, type: "text" },
      { field: "HealthCareFacilityName", label: "Location", sortable: true, type: "text" },
//      { field: "incident_level", label: "Level", sortable: true, type: "level" },
      { field: "suggested_level", label: "Response Level", sortable: true, type: "level" },
      { field: "casualties", label: "Casualties", sortable: true, type: "casualties" },
      { field: "is_open", label: "Status", sortable: true, type: "status" },
      { field: "IncidentLocationType", label: "Loc Type", sortable: true, type: "text" },
      { field: "facility_type", label: "Facility Type", sortable: true, type: "text" },
 //     { field: "updated_at", label: "Updated At", sortable: true, type: "datetime" },
      { field: "action", label: "Action", sortable: false, type: "button", text: "Engage" }
    ],

    getApiUrl: function() {
      return "http://" + this.connection.vantiqServer + this.connection.restEndpoint;
    },

    getAuthHeader: function() {
      return {
        "Authorization": "Bearer " + this.connection.accessToken,
        "Content-Type": "application/json"
      };
    }
  };

  function mhWaitForRoot() {
    var root = document.getElementById("mhIncidentLog1Root");
    if (!root) {
      setTimeout(mhWaitForRoot, 300);
      return;
    }
    if (root.dataset.initialized === "true") {
      return;
    }
    root.dataset.initialized = "true";
    mhCreateIncidentLog1App(root);
  }

  function mhCreateIncidentLog1App(root) {
    var allIncidents = [];
    var filteredIncidents = [];
    var previousIncidents = {};
    var sortColumn = "occurred_at";
    var sortDirection = "desc";
    var autoRefreshInterval = null;

    var elements = {
      apiEndpoint: root.querySelector("#mhIncidentLog1ApiEndpoint"),
      refreshBtn: root.querySelector("#mhIncidentLog1RefreshBtn"),
      autoRefreshToggle: root.querySelector("#mhIncidentLog1AutoRefreshToggle"),
      statusFilter: root.querySelector("#mhIncidentLog1StatusFilter"),
      levelFilter: root.querySelector("#mhIncidentLog1LevelFilter"),
      searchInput: root.querySelector("#mhIncidentLog1SearchInput"),
      clearFiltersBtn: root.querySelector("#mhIncidentLog1ClearFiltersBtn"),
      totalIncidents: root.querySelector("#mhIncidentLog1TotalIncidents"),
      openCount: root.querySelector("#mhIncidentLog1OpenCount"),
      closedCount: root.querySelector("#mhIncidentLog1ClosedCount"),
      lastUpdated: root.querySelector("#mhIncidentLog1LastUpdated"),
      tableHead: root.querySelector("#mhIncidentLog1TableHead"),
      incidentsTableBody: root.querySelector("#mhIncidentLog1TableBody"),
      loadingSpinner: root.querySelector("#mhIncidentLog1LoadingSpinner"),
      errorMessage: root.querySelector("#mhIncidentLog1ErrorMessage"),
      detailModal: root.querySelector("#mhIncidentLog1DetailModal"),
      detailContent: root.querySelector("#mhIncidentLog1DetailContent"),
      closeBtn: root.querySelector(".mh-incidentlog1__close")
    };

    initializeApp();

    function initializeApp() {
      elements.apiEndpoint.value = mhIncidentLog1Config.getApiUrl();

      //elements.apiEndpoint.style.display = "none";
      elements.apiEndpoint.hidden = true;

     // elements.levelFilter.value = "All";

      elements.statusFilter.value = "open";
      
      buildTableHeader();
      attachEventListeners();
      loadIncidents();

      if (mhIncidentLog1Config.autoRefresh.enabled) {
        startAutoRefresh();
      }
    }

    function buildTableHeader() {
      var tr = document.createElement("tr");

      mhIncidentLog1Config.columns.forEach(function(column) {
        var th = document.createElement("th");
        th.textContent = column.label;

        if (column.sortable) {
          th.className = "mh-incidentlog1__sortable";
          th.setAttribute("data-sort", column.field);

          var sortIcon = document.createElement("span");
          sortIcon.className = "mh-incidentlog1__sort-icon";
          sortIcon.textContent = "⇅";
          th.appendChild(document.createTextNode(" "));
          th.appendChild(sortIcon);
        }

        tr.appendChild(th);
      });

      elements.tableHead.innerHTML = "";
      elements.tableHead.appendChild(tr);
    }

    function attachEventListeners() {
      elements.refreshBtn.addEventListener("click", loadIncidents);
      elements.autoRefreshToggle.addEventListener("change", handleAutoRefreshToggle);
      elements.statusFilter.addEventListener("change", applyFilters);
      elements.levelFilter.addEventListener("change", applyFilters);
      elements.searchInput.addEventListener("input", applyFilters);
      elements.clearFiltersBtn.addEventListener("click", clearFilters);

      bindSortableHeaders();

      if (elements.closeBtn) {
        elements.closeBtn.addEventListener("click", closeModal);
      }

      elements.incidentsTableBody.addEventListener("click", function(e) {

        var btn = e.target.closest(".mh-incidentlog1__row-btn");
        if (!btn) return;

        e.stopPropagation(); // prevent row click (modal)

        var incidentId = btn.getAttribute("data-id");

        //alert("Clicked incident: " + incidentId);
        var client = Client.instance;
        client.data.currentIncident.id = incidentId;
        client.data.currentIncident.step = 2;
        client.popupPage("IncidentDetail","Incident Detail");
//        client.execute({},"jp.co.vantiq.ActionAgent.createMessage",function(response)
//        {
            //
            //  At this point "response" is results of the Procedure call
            //
           // console.log("SUCCESS: " + JSON.stringify(response));
//        });


      });      

      window.addEventListener("click", function(e) {
        if (e.target === elements.detailModal) {
          closeModal();
        }
      });
    }

    function bindSortableHeaders() {
      var sortableHeaders = root.querySelectorAll("#mhIncidentLog1Table th.mh-incidentlog1__sortable");
      Array.prototype.forEach.call(sortableHeaders, function(th) {
        th.addEventListener("click", function() {
          var column = th.getAttribute("data-sort");
          sortTable(column);
        });
      });
    }

    function handleAutoRefreshToggle() {
      if (elements.autoRefreshToggle.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    }

    function startAutoRefresh() {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
      autoRefreshInterval = setInterval(loadIncidents, mhIncidentLog1Config.autoRefresh.interval);
    }

    function stopAutoRefresh() {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    }

    function fetchWithTimeout(url, options, timeoutMs) {
      return new Promise(function(resolve, reject) {
        var controllerSupported = typeof AbortController !== "undefined";
        var controller = controllerSupported ? new AbortController() : null;
        var timer = setTimeout(function() {
          if (controller) {
            controller.abort();
          } else {
            reject(new Error("Request timeout"));
          }
        }, timeoutMs);

        var fetchOptions = options || {};
        if (controller) {
          fetchOptions.signal = controller.signal;
        }

        fetch(url, fetchOptions)
          .then(function(response) {
            clearTimeout(timer);
            resolve(response);
          })
          .catch(function(err) {
            clearTimeout(timer);
            reject(err);
          });
      });
    }

    function retryFetchJson(url, options) {
      var maxAttempts = mhIncidentLog1Config.api.retry.enabled ? mhIncidentLog1Config.api.retry.maxAttempts : 1;
      var attempt = 1;

      return new Promise(function(resolve, reject) {
        function runAttempt() {
          fetchWithTimeout(url, options, mhIncidentLog1Config.api.timeout)
            .then(function(response) {
              if (!response.ok) {
                throw new Error("HTTP error! status: " + response.status);
              }
              return response.json();
            })
            .then(function(data) {
              resolve(data);
            })
            .catch(function(err) {
              if (attempt < maxAttempts) {
                attempt += 1;
                setTimeout(runAttempt, mhIncidentLog1Config.api.retry.delay);
              } else {
                reject(err);
              }
            });
        }

        runAttempt();
      });
    }

    function loadIncidents() {
      hideError();

      return retryFetchJson(mhIncidentLog1Config.getApiUrl(), {
        method: "GET",
        headers: mhIncidentLog1Config.getAuthHeader()
      })
        .then(function(data) {
          previousIncidents = createIncidentMap(allIncidents);
          allIncidents = Array.isArray(data) ? data : [];

          allIncidents.sort(function(a, b) {
            return new Date(b.occurred_at) - new Date(a.occurred_at);
          });

          if (mhIncidentLog1Config.display.maxIncidents && allIncidents.length > mhIncidentLog1Config.display.maxIncidents && mhIncidentLog1Config.display.maxIncidents >= 0) {
            allIncidents = allIncidents.slice(0, mhIncidentLog1Config.display.maxIncidents);
          }

          applyFilters();
          updateStats();
          updateLastUpdatedTime();
        })
        .catch(function(error) {
          showError("Failed to load incidents: " + error.message);
        });
    }

    function createIncidentMap(incidents) {
      var map = {};
      incidents.forEach(function(incident) {
        map[incident.incident_id] = JSON.parse(JSON.stringify(incident || {}));
      });
      return map;
    }

    function detectChanges(incidentId, newIncident) {
      var oldIncident = previousIncidents[incidentId];
      if (!oldIncident) {
        return { isNew: true, changedFields: [] };
      }

      var changedFields = [];
      var fieldsToCheck = ["incident_type", "incident_level", "casualties", "is_open", "updated_at"];

      fieldsToCheck.forEach(function(field) {
        if (JSON.stringify(oldIncident[field]) !== JSON.stringify(newIncident[field])) {
          changedFields.push(field);
        }
      });

      return { isNew: false, changedFields: changedFields };
    }

    function applyFilters() {
      var statusFilter = elements.statusFilter.value;
      var levelFilter = elements.levelFilter.value;
      var searchTerm = (elements.searchInput.value || "").toLowerCase();

      filteredIncidents = allIncidents.filter(function(incident) {
        if (statusFilter === "open" && !incident.is_open) return false;
        if (statusFilter === "closed" && incident.is_open) return false;
        if (levelFilter && String(incident.incident_level) !== levelFilter) return false;

        if (searchTerm) {
          var searchableText = JSON.stringify(incident).toLowerCase();
          if (searchableText.indexOf(searchTerm) === -1) return false;
        }

        return true;
      });

      updateStats();
      updateSortIndicators();
      renderTable();
    }

    function clearFilters() {
      elements.statusFilter.value = "";
      elements.levelFilter.value = "";
      elements.searchInput.value = "";
      applyFilters();
    }

    function updateStats() {
      elements.totalIncidents.textContent = allIncidents.length;
      elements.openCount.textContent = allIncidents.filter(function(i) { return i.is_open; }).length;
      elements.closedCount.textContent = allIncidents.filter(function(i) { return !i.is_open; }).length;
    }

    function updateLastUpdatedTime() {
      var now = new Date();
      elements.lastUpdated.textContent = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    function sortTable(column) {
      if (sortColumn === column) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortColumn = column;
        sortDirection = "asc";
      }

      filteredIncidents.sort(function(a, b) {
        var aVal = getSortValue(a, column);
        var bVal = getSortValue(b, column);

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      updateSortIndicators();
      renderTable();
    }

    function getSortValue(incident, column) {
      var value = incident[column];

      if (value === null || value === undefined) value = "";

      if (column === "occurred_at" || column === "updated_at") {
        return new Date(value);
      }

      if (column === "casualties") {
        return Number(value) || 0;
      }

      if (column === "is_open") {
        return value ? 1 : 0;
      }

      if (column === "elapsed_time") {
        if (!incident.occurred_at) return 0;
        return new Date() - new Date(incident.occurred_at);
      }

      return String(value).toLowerCase();
    }

    function updateSortIndicators() {
      var sortableHeaders = root.querySelectorAll("#mhIncidentLog1Table th.mh-incidentlog1__sortable");
      Array.prototype.forEach.call(sortableHeaders, function(th) {
        th.classList.remove("mh-incidentlog1__sortable--asc", "mh-incidentlog1__sortable--desc");
        var column = th.getAttribute("data-sort");
        if (column === sortColumn) {
          th.classList.add(sortDirection === "asc" ? "mh-incidentlog1__sortable--asc" : "mh-incidentlog1__sortable--desc");
        }
      });
    }

    function renderTable() {
      elements.incidentsTableBody.innerHTML = "";

      if (filteredIncidents.length === 0) {
        var emptyRow = document.createElement("tr");
        var emptyCell = document.createElement("td");
        emptyCell.colSpan = mhIncidentLog1Config.columns.length;
        emptyCell.style.textAlign = "center";
        emptyCell.style.color = "#666";
        emptyCell.textContent = "No incidents to display";
        emptyRow.appendChild(emptyCell);
        elements.incidentsTableBody.appendChild(emptyRow);
        return;
      }

      filteredIncidents.forEach(function(incident) {
        var row = document.createElement("tr");
        
        if (isIncidentNeedineAttention(incident)){
            row.classList.add("mh-incidentlog1__row-attention");    
            //console.log("NeedineAttention");

        }{
          //console.log("Not NeedineAttention");
        }

        row.addEventListener("click", function(e) {
          if (e.target.closest(".mh-incidentlog1__row-btn")) {
            return;
          }

          window.mhIncidentLog1SelectedIncident = incident;

          window.dispatchEvent(new CustomEvent("mhIncidentLog1IncidentSelected", {
            detail: incident
          }));

          showIncidentDetails(incident); // remove this line if you do NOT want the modal anymore
        });        

/*        
        row.addEventListener("click", function(e) {
          if (e.target.closest(".mh-incidentlog1__row-btn")) {
            return;
          }
          showIncidentDetails(incident);
        });
*/


        var changes = detectChanges(incident.incident_id, incident);

        mhIncidentLog1Config.columns.forEach(function(column) {
          var td = document.createElement("td");

          if (changes.changedFields.indexOf(column.field) >= 0) {
            td.classList.add("mh-incidentlog1__cell-changed");
          }

          if (column.type === "casualties") {
            td.classList.add(getCasualtiesClass(incident.casualties));
          }

          td.innerHTML = formatCellValue(incident, column);
          row.appendChild(td);
        });

        elements.incidentsTableBody.appendChild(row);
      });
    }

    function formatCellValue(incident, column) {
      var value = incident[column.field];

      if (column.type === "datetime") {
        return escapeHtml(formatTimestamp(value));
      }

      if (column.type === "level") {
        return formatLevel(value);
      }

      if (column.type === "location") {
        return formatLocation(value);
      }

      if (column.type === "status") {
        return formatStatus(value);
      }

      if (column.type === "elapsed") {
        return escapeHtml(formatElapsedTime(incident.occurred_at));
      }

      if (column.type === "casualties") {
        return escapeHtml(String(value || "0"));
      }

      if (column.type === "button") {

        var minLevel = mhIncidentLog1Config.buttonRules.minLevel;

        // Only show button if level > 3
        if (!incident.incident_level || incident.incident_level < minLevel) {
          return ""; // no button
        }

        var btnClass = "mh-incidentlog1__row-btn";

        if (isIncidentNeedineAttention(incident)){
          btnClass += " mh-incidentlog1__row-btn--attention";
        }

        //console.log(btnClass);
        return '<button class="'+btnClass+'" data-id="' +
          escapeHtml(incident.incident_id) +
          '">' + (column.text || "Action") + '</button>';
      }    

      return escapeHtml(value || "-");
    }

    function formatTimestamp(timestamp) {
      if (!timestamp) return "N/A";
      var date = new Date(timestamp);
      return date.toLocaleString("en-US", mhIncidentLog1Config.display.dateFormat);
    }

    function formatLevel(level) {
      if (!level && level !== 0) return '<span class="mh-incidentlog1__level-badge"></span>';

      var colorClass = "";
      if (level === 1) colorClass = "mh-incidentlog1__level-badge--critical";
      else if (level === 2) colorClass = "mh-incidentlog1__level-badge--high";
      else if (level === 3) colorClass = "mh-incidentlog1__level-badge--medium";
      else if (level === 4 || level === 5) colorClass = "mh-incidentlog1__level-badge--low";

      return '<span class="mh-incidentlog1__level-badge ' + colorClass + '">' + escapeHtml(String(level)) + "</span>";
    }

    function formatLocation(location) {
      if (!location) return "N/A";
      if (location.type === "Point" && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        var lon = location.coordinates[0];
        var lat = location.coordinates[1];
        var googleMapsUrl = "https://www.google.com/maps?q=" + lat + "," + lon;
        return '<a href="' + googleMapsUrl + '" target="_blank" style="color:#60a5fa;text-decoration:underline;" onclick="event.stopPropagation()">' +
          escapeHtml(lat.toFixed(4) + "°N, " + lon.toFixed(4) + "°E") + "</a>";
      }
      return "N/A";
    }

    function formatStatus(isOpen) {
      if (isOpen) {
        return '<span class="mh-incidentlog1__status-badge mh-incidentlog1__status-badge--open">Open</span>';
      }
      return '<span class="mh-incidentlog1__status-badge mh-incidentlog1__status-badge--closed">Closed</span>';
    }

    function formatElapsedTime(occurredAt) {
      if (!occurredAt) return "N/A";

      var now = new Date();
      var occurred = new Date(occurredAt);
      var diffMs = now - occurred;

      if (diffMs < 0) return "N/A";

      var totalMinutes = Math.floor(diffMs / (1000 * 60));
      var totalHours = Math.floor(diffMs / (1000 * 60 * 60));
      var totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (totalDays >= 1) {
        return totalDays + " day" + (totalDays > 1 ? "s" : "");
      } else if (totalHours >= 1) {
        return totalHours + " hour" + (totalHours > 1 ? "s" : "");
      } else {
        return totalMinutes + " min" + (totalMinutes !== 1 ? "s" : "");
      }
    }

    function getCasualtiesClass(casualties) {
      if (!casualties) return "mh-incidentlog1__casualties-low";
      if (casualties >= 50) return "mh-incidentlog1__casualties-high";
      if (casualties >= 10) return "mh-incidentlog1__casualties-medium";
      return "mh-incidentlog1__casualties-low";
    }

    function showIncidentDetails(incident) {
      elements.detailContent.innerHTML = "";

      var basicSection = document.createElement("div");
      basicSection.className = "mh-incidentlog1__detail-section";
      basicSection.innerHTML =
        "<h3>Basic Information</h3>" +
        '<div class="mh-incidentlog1__log-field"><strong>Incident ID:</strong> ' + escapeHtml(incident.recordnumber || "N/A") + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Type:</strong> ' + escapeHtml(incident.incident_type || "N/A") + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>SubType:</strong> ' + escapeHtml(incident.incident_subtype || "N/A") + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Level:</strong> ' + formatLevel(incident.incident_level) + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Status:</strong> ' + formatStatus(incident.is_open) + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Occurred At:</strong> ' + escapeHtml(formatTimestamp(incident.occurred_at)) + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Updated At:</strong> ' + escapeHtml(formatTimestamp(incident.updated_at)) + "</div>" +
//        '<div class="mh-incidentlog1__log-field"><strong>Elapsed Time:</strong> ' + escapeHtml(formatElapsedTime(incident.occurred_at)) + "</div>" +
        '<div class="mh-incidentlog1__log-field"><strong>Casualties:</strong> ' + escapeHtml(String(incident.casualties || "0")) + "</div>";
      elements.detailContent.appendChild(basicSection);

      if (incident.incident_location) {
        var locationSection = document.createElement("div");
        locationSection.className = "mh-incidentlog1__detail-section";
        locationSection.innerHTML =
          "<h3>Location</h3>" +
          '<div class="mh-incidentlog1__log-field"><strong>Coordinates:</strong> ' + formatLocation(incident.incident_location) + "</div>" +
          '<div class="mh-incidentlog1__detail-json">' + syntaxHighlight(JSON.stringify(incident.incident_location, null, 2)) + "</div>";
        elements.detailContent.appendChild(locationSection);
      }

      var fullSection = document.createElement("div");
      fullSection.className = "mh-incidentlog1__detail-section mh-incidentlog1__collapsible-section";
      fullSection.innerHTML =
        '<h3 class="mh-incidentlog1__collapsible-header">' +
          '<span class="mh-incidentlog1__collapse-icon">▶</span>' +
          "<span>Full JSON</span>" +
        "</h3>" +
        '<div class="mh-incidentlog1__collapsible-content" style="display:none;">' +
          '<div class="mh-incidentlog1__detail-json">' + syntaxHighlight(JSON.stringify(removeArgsFields(incident), null, 2)) + "</div>" +
        "</div>";
      elements.detailContent.appendChild(fullSection);

      var collapseHeader = fullSection.querySelector(".mh-incidentlog1__collapsible-header");
      var collapseContent = fullSection.querySelector(".mh-incidentlog1__collapsible-content");
      var collapseIcon = fullSection.querySelector(".mh-incidentlog1__collapse-icon");

      collapseHeader.addEventListener("click", function() {
        var isHidden = collapseContent.style.display === "none";
        collapseContent.style.display = isHidden ? "block" : "none";
        collapseIcon.textContent = isHidden ? "▼" : "▶";
      });

      elements.detailModal.style.display = "block";
    }

    function syntaxHighlight(json) {
      var safeJson = String(json)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return safeJson.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
          var cls = "mh-incidentlog1__json-number";
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? "mh-incidentlog1__json-key" : "mh-incidentlog1__json-string";
          } else if (/true|false/.test(match)) {
            cls = "mh-incidentlog1__json-boolean";
          } else if (/null/.test(match)) {
            cls = "mh-incidentlog1__json-null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      );
    }

    function closeModal() {
      elements.detailModal.style.display = "none";
    }

    function showError(message) {
      elements.errorMessage.textContent = message;
      elements.errorMessage.style.display = "block";
    }

    function hideError() {
      elements.errorMessage.style.display = "none";
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  }

  function removeArgsFields(obj) {
    if (!obj || typeof obj !== "object") return obj;

    var result = {};
    var key;

      for (key in obj){
        if (obj.hasOwnProperty(key)) {
          if(key.indexOf("ars_") === 0) {
            continue;
          }

          var value = obj[key];

          if (value && typeof value == "object" && !Array.isArray(value)) {
            result[key] = removeArgsFields(value);
          } else {
              result[key] = value;
          }

        }
      }

    //console.log(result);
    return result;

  }

  function isIncidentNeedineAttention(incident){

    if (!mhIncidentLog1Config.attentionRules.enabled){
      return false;
    }

    if (!incident.is_open){
      return false;
    }

    var rules = mhIncidentLog1Config.attentionRules;

    // activated = true do not flag

    if (incident.activated){
        return false;
    }

    // Rule 1: severity
    if (incident.suggested_level >= rules.minlevel){
      return true;
    }

    // Rule 2: open too long

    if (incident.occurred_at && rules.maxAgeMinutes){
        var now = new Date();
        var occured = new Date(incident.occurred_at);
        var diffMinutes = (now - occured) / (1000*60);
        //console.log(diffMinutes);
        if (diffMinutes >= rules.maxAgeMinutes && rules.maxAgeMinutes > 0){
          return true;
        }
        return false;
    }

    if (incident.incident_subtype == rules.subType){
        return true;
    }
    return false;
  }

  mhWaitForRoot();
})();
//
// Custom Client Code ends here