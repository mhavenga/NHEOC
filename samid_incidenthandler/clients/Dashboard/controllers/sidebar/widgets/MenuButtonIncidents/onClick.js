    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "1";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard Level 1";
    client.goToPage("IncidentDashboard");

