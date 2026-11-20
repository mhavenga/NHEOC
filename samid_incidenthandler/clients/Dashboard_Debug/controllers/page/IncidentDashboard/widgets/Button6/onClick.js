    var ds = client.getDataStreamByName("tqIncidents");
    var p = new TimedQueryParameters();
    p.whereClause = ClearFilter(client);
    client.modifyTimedQuery(ds,p);      
