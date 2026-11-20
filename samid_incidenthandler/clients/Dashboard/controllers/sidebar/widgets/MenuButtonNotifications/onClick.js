    //client.goToPage("Notifications");
    var DroplistLevel = client.getWidget("DroplistLevel");
    DroplistLevel.boundValue = "5";
    BuildFilter(client);
    client.getWidget("StaticTextIncidentHeader").text = "VANTIQ Incident Status Dashboard Level 5";

    client.goToPage("IncidentDashboard");