    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "All";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard All Levels";
    client.goToPage("IncidentDashboard");
