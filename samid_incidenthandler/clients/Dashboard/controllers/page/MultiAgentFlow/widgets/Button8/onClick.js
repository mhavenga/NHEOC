    var wd = client.getWidget("CheckboxRefresh");
    var ds = client.getDataStreamByName("tqIncidents");
    ds.restart();  
    ds.isPaused = !wd.boundValue;