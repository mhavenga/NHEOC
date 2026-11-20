    if (extra.columnName == "ButtonAcknowledge"){

        var args = {
            id: extra.dataObject.id
        };
        console.log(args);

        client.execute(args,"jp.co.vantiq.ActionAgent.acknowledgeNotification",function(response)
        {
            // Try to refresh Grid   
            var ds = client.getDataStreamByName("tqNotifications");
            ds.restart();
        });
            
        } 
    //console.log(extra);