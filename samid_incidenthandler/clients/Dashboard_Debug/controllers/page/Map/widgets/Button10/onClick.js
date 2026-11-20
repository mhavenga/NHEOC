    var ds = client.getDataStreamByName("tqIncidents");
    var p = new TimedQueryParameters();
    p.whereClause = ClearMapFilter(client);
    client.modifyTimedQuery(ds,p);      
