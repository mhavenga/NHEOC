    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "4";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard Level 4";

    client.goToPage("IncidentDashboard");