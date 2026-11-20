    const now = new Date();
    client.getWidget("StaticTextLastUpdate").text = now.toLocaleTimeString(); 
    client.execute({},"jp.co.vantiq.UIEventBridger.getAuditLogCount",function(response)
    {
        client.getWidget("StaticTextAuditCount").text = response.auditCount;
        client.getWidget("StaticTexAgentEvents").text = response.agentEventCount;
        client.getWidget("StaticTextAuditTabIncidentCount").text = response.incidentCount;
        client.getWidget("StaticTextShowingCount").text = data.length;
        
    });
