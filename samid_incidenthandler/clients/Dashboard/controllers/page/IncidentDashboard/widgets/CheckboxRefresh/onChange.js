    var wd = client.getWidget("CheckboxRefresh");
    var ds = client.getDataStreamByName("tqIncidents");

    ds.isPaused = !wd.boundValue;