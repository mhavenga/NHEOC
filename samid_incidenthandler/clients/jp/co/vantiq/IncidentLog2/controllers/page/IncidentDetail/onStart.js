//var mhIncidentLog1Config = {
  var  display  = {
      dateFormat: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      },
      maxIncidents: 100
    };
 // };

    var Conversation = client.getWidget("Conversation");
    Conversation.clearText();

    function sleep(ms, callback) {
    setTimeout(callback, ms);
    }    

      var args = {
              incident_id: client.data.currentIncident.id 
          };

          client.execute(args,"jp.co.vantiq.UIEventBridger.getIncidentDetail",function(response)
          {
              client.execute({incident_id: response.incident_id},"jp.co.vantiq.UIEventBridger.getIncidentNotifications",function(notifications)
              {
                  incidentDetailHTML({
                  incident_id: response.recordnumber,
                  incident_type: response.incident_type,
                  incident_subtype: response.incident_subtype,
                  incident_level: response.suggested_level,
                  is_open: response.is_open,
                  casualties: response.casualties,
                  occurred_at: response.IncidentDateTime,
                  updated_at: response.updated_at,
                  location: response.HealthCareFacilityName,
                  notes: response.notes,
                  notifications: notifications

                  });


                  if (!response.activated && response.is_open){
                    client.data.currentIncident.step = 2; 
                  }else{
                    client.data.currentIncident.step = 7;
                  }


              });  

              client.getWidget("StaticTextHeader").text = response.incident_subtype;


              if (response.is_open){
                var args = {
                    data: response
                };
                client.execute(args,"jp.co.vantiq.chatService.mitigationRequest",function(response2)
                {
                    sleep(2000, function () {
                      //Conversation.addAIMessage(response2, true);
                      Conversation.addAIMessage("Welcome", true);
                      if (client.data.currentIncident.step == 2){
                        Conversation.submitHumanMessage("...", true);
                      }
                    });        
                        
                }); 
              } else{
                  Conversation.addAIMessage("Welcome", true);
              }  

              client.data.currentIncidentData = response;   
          });
     


    function incidentDetailHTML(incident){

        var el = document.getElementById("mhIncidentDetailContent");
        if (!el) return;

        if (!incident) {
            el.innerHTML = "<em>No incident selected</em>";
            return;
        }

        var html = "";

        // Container
        html += '<div style="font-family:Arial, sans-serif; color:#e2e8f0; background:#1e293b; padding:16px; border-radius:10px;">';

        // Title
        html += '<h3 style="color:#60a5fa; margin-top:0; margin-bottom:12px;">Incident Details</h3>';

        // Helper row style
        function row(label, value) {
            return '<div style="margin-bottom:6px;">' +
            '<span style="color:#94a3b8; font-weight:600;">' + label + ':</span> ' +
            '<span>' + value + '</span>' +
            '</div>';
        }

        html += row("Incident ID", esc(incident.incident_id));
        html += row("Type", esc(incident.incident_type));
        html += row("Type", esc(incident.incident_subtype));
        
        html += row("Level", formatLevel(incident.incident_level));
        html += row("Status", formatStatus(incident.is_open));
        html += row("Occurred At", formatTimestamp(incident.occurred_at));
        html += row("Updated At", formatTimestamp(incident.updated_at));
        html += row("Casualties", esc(incident.casualties || "0"));

        if (incident.incident_location) {
            html += row("Location", formatLocation(incident.incident_location));
        }

        if (incident.notes) {
            html += row("Notes", esc(incident.notes));
        }

        if (incident.notifications.length){
          html += "<table>";
          html += "<thead>";
          html += "<tr>";
          html += "<th>Date</th>";
          html += "<th>Message</th>";
          html += "</tr>";
          html += "</thead>";
          html += "<tbody>";

          for (var i = 0; i < incident.notifications.length; i++){

              html += "<tr>";
              html += "<td>"+formatTimestamp(incident.notifications[i].createdAt)+"</td>";
              html += "<td>"+incident.notifications[i].messageBody+"</td>";
              html += "</tr>";

          }

          html += "</tbody>";

          html += "</table>";

          console.log(incident.notifications);
//            html += row("Notification", esc(incident.notifications[0].messageBody));
        }

/*
        // JSON block
        html += '<div style="margin-top:12px;">' +
                '<div style="color:#94a3b8; font-weight:600; margin-bottom:4px;">Raw Data</div>' +
                '<pre style="background:#0f172a; padding:10px; border-radius:8px; color:#e2e8f0; font-size:12px; white-space:pre-wrap;">' +
                esc(JSON.stringify(incident, null, 2)) +
                '</pre>' +
                '</div>';

        html += '</div>';
*/
        el.innerHTML = html;

/*        
        var html = "<h2>Incident Details</h2>";
            html += "<h3>Basic Information</h3>";
            html += "<div><strong>Incident ID:</strong><span>&nbsp;</span>"+id+"</div>";
            html += "<div><strong>Type:</strong><span>&nbsp;</span>Mass Casualty Event</div>";
            html += "<div><strong>Level:</strong><span>&nbsp;</span><span style='box-sizing: border-box; display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;'>4</span></div>";
            html += "<div><strong>Status:</strong><span>&nbsp;</span><span style='box-sizing: border-box; display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; background: rgba(245, 158, 11, 0.2); color: rgb(251, 191, 36); border: 1px solid rgba(245, 158, 11, 0.4);'>Open</span></div>";
            html += "<div><strong>Occurred At:</strong><span>&nbsp;</span>Mar 10, 2026, 04:33:09 PM</div>";
            html += "<div><strong>Updated At:</strong><span>&nbsp;</span>Mar 10, 2026, 04:33:45 PM</div>";
            html += "<div><strong>Casualties:</strong><span>&nbsp;</span>32</div>";
            return html; 
*/            
    }

function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  return d.toLocaleString();
}

function formatStatus(isOpen) {
  return isOpen ? "Open" : "Closed";
}

function formatLevel(level) {
  if (!level && level !== 0) return "";
  return "Level " + level;
}

function formatLocation(loc) {
  if (!loc || !loc.coordinates) return "";
  var lon = loc.coordinates[0];
  var lat = loc.coordinates[1];
  return lat.toFixed(4) + ", " + lon.toFixed(4);
}    

function formatTimestamp(timestamp) {
    if (!timestamp) return "N/A";
    var date = new Date(timestamp);
    return date.toLocaleString("en-US", display.dateFormat);
}
    