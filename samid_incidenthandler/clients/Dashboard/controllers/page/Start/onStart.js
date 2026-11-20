    var MenuButtonMultiAgent = client.getWidget("MenuButtonMultiAgent");
    MenuButtonMultiAgent.isVisible = false;
    client.getWidget("MenuButtonMap").isVisible = false;
    client.getWidget("MenuButtonAuditLogs").isVisible = false;
    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "All";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard All Level";
    client.goToPage("IncidentDashboard");