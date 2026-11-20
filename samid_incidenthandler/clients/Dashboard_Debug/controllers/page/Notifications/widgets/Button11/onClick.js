    var ds = client.getDataStreamByName("tqNotifications");
    var p = new TimedQueryParameters();
    p.whereClause = ClearFilter(client);
    client.modifyTimedQuery(ds,p);      
    ClearNotificationFilter(client);
