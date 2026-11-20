    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "3";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard Level 3";
    client.goToPage("IncidentDashboard");