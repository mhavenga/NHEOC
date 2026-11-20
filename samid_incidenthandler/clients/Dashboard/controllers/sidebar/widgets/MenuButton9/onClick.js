    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "2";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard Level 2";

    client.goToPage("IncidentDashboard");