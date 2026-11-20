    console.log(extra);
    if (extra.columnName == "ButtonAlerts"){
        // recordnumber

        //alert(extra.dataObject.incident_id);

        var ds = client.getDataStreamByName("selectedIncidentNotification");
        ds.isPaused = false;

        var p = new TimedQueryParameters();
        var filter = {incidentId: extra.dataObject.incident_id};
        
        p.whereClause = filter;
        console.log(filter);
        client.modifyTimedQuery(ds,p);

        client.popupPage("IncidentNotifications");
    }