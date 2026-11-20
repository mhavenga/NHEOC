
    //alert(client.data.currentIncidentData.incident_id);

    client.execute({incident_id: client.data.currentIncidentData.incident_id},"jp.co.vantiq.UIEventBridger.getIncidentNotifications",function(notifications)
    {
        client.sendClientEvent("ceNotifications",notifications);
    });    
    

