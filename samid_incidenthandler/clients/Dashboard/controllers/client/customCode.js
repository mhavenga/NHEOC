   
   function hideButton(client){
        var myTable = client.getWidget("DataTableNotifications");

        console.log(JSON.stringify(Object.keys(myTable)));
        console.log(myTable);

/*        var dt = myTable;  //.dataTable;

        console.log(dt);

        dt.settings()[0].oInit.drawCallback = function() {
            dt.rows().every(function() {
                var rowData = this.data();
                var rowNode = this.node();

                // Hide the button if condition is met
                if (rowData.status === "Ack") {
                    $(rowNode).find("button").hide();
                } else {
                    $(rowNode).find("button").show();
                }
            });
        };

        dt.draw(false);  */
   }    
   
   
   
   
   
   function BuildAuditLogFilter(client)
    {
        var DroplistEventType = client.getWidget("DroplistEventType");
        var DroplistAgentName = client.getWidget("DroplistAgentName");
        var DroplistIncidentID = client.getWidget("DroplistIncidentID");
        var InputStringSearchAudit = client.getWidget("InputStringSearchAudit");

        var filters = [];
        var filter = {};

        if (DroplistEventType.boundValue != "All"){
            filters.push({"event_type": DroplistEventType.boundValue.toLowerCase()});
        }

        if (DroplistAgentName.boundValue != "All"){
            filters.push({"agent_name": DroplistAgentName.boundValue.toLowerCase()});
        }

        if (DroplistIncidentID.boundValue != "All"){
            filters.push({"incident_id": DroplistIncidentID.boundValue});
        }

        if (InputStringSearchAudit.boundValue != ""){
            filters.push({"incident_type" : {
                 "$regex": InputStringSearchAudit.boundValue,
                "$options": "i"
            }});
        }

        if (filters.length > 1){
            filter = {"$and": filters};
        } else if (filters.length == 1){
            filter = filters[0];
        }        

        var ds = client.getDataStreamByName("tqAuditLog");
        var p = new TimedQueryParameters();

        p.whereClause = filter;

        client.modifyTimedQuery(ds,p);

        return filter;

    }

    function ClearAuditLogFilter(client){

        var DroplistEventType = client.getWidget("DroplistEventType");
        DroplistEventType.boundValue = "All";
        var DroplistAgentName = client.getWidget("DroplistAgentName");
        DroplistAgentName.boundValue = "All";
        var DroplistIncidentID = client.getWidget("DroplistIncidentID");
        DroplistIncidentID.boundValue = "All";
        var InputStringSearchAudit = client.getWidget("InputStringSearchAudit");
        InputStringSearchAudit.boundValue = "";
        return {};
    }

   
    function BuildFilter(client)
    {
        var DroplistLevel = client.getWidget("DroplistLevel");
        var DroplistStatus = client.getWidget("DroplistStatus");
        var InputStringSearch = client.getWidget("InputStringSearch");

        var filters = [];
        var filter = {};

        if (DroplistLevel.boundValue != "All"){
            filters.push({"suggested_level": DroplistLevel.boundValue});
        }

        if (DroplistStatus.boundValue == "Open"){
            filters.push({"is_open": true});
        } else if (DroplistStatus.boundValue == "Closed"){
            filters.push({"is_open": false});
        }

        if (InputStringSearch.boundValue != ""){
            filters.push({
                "$or": [
                    {"incident_type" : {
                        "$regex": InputStringSearch.boundValue,
                        "$options": "i"
                    }
                    },
                    {"incident_subtype" : {
                        "$regex": InputStringSearch.boundValue,
                        "$options": "i"
                    }
                    }
                ]
            });
        }

        if (filters.length > 1){
            filter = {"$and": filters};
        } else if (filters.length == 1){
            filter = filters[0];
        }        

        var ds = client.getDataStreamByName("tqIncidents");
        var p = new TimedQueryParameters();

        p.whereClause = filter;
        console.log(filter);

        client.modifyTimedQuery(ds,p);

        return filter;

    }

    function ClearFilter(client){

        var DroplistLevel = client.getWidget("DroplistLevel");
        DroplistLevel.boundValue = "All";
        var DroplistStatus = client.getWidget("DroplistStatus");
        DroplistStatus.boundValue = "All";
        var InputStringSearch = client.getWidget("InputStringSearch");
        InputStringSearch.boundValue = "";

        return {};
    }

function BuildNotificationFilter(client)
    {
        var DroplistLevel = client.getWidget("DroplistNotificationLevel");
        var DroplistStatus = client.getWidget("DroplistNotificationStatus");
        var InputStringSearch = client.getWidget("InputStringNotificationSearch");
        var DroplistNotificationType = client.getWidget("DroplistNotificationType");

        var filters = [];
        var filter = {};

        if (DroplistLevel.boundValue != "All"){
            filters.push({"incident_level": DroplistLevel.boundValue});
        }

        if (DroplistNotificationType.boundValue != "All"){
            filters.push({"notificationType": DroplistNotificationType.boundValue});
        }


        if (DroplistStatus.boundValue != "All"){
            filters.push({"status": DroplistStatus.boundValue});
        }

        if (InputStringSearch.boundValue != ""){
            filters.push({"messageBody" : {
                 "$regex": InputStringSearch.boundValue,
                "$options": "i"
            }});
        }

        if (filters.length > 1){
            filter = {"$and": filters};
        } else if (filters.length == 1){
            filter = filters[0];
        }        

        var ds = client.getDataStreamByName("tqNotifications");
        var p = new TimedQueryParameters();

        p.whereClause = filter;
        console.log(filter);
        client.modifyTimedQuery(ds,p);

        return filter;

    }

    function ClearNotificationFilter(client){

        var DroplistLevel = client.getWidget("DroplistNotificationLevel");
        DroplistLevel.boundValue = "All";
        var DroplistStatus = client.getWidget("DroplistNotificationStatus");
        DroplistStatus.boundValue = "All";
        var InputStringSearch = client.getWidget("InputStringNotificationSearch");
        InputStringSearch.boundValue = "";
        var DroplistNotificationType = client.getWidget("DroplistNotificationType");
        DroplistNotificationType.boundValue = "All";
        return {};
    }

    function LoadDroplistIncident(client){
        var DroplistIncidentID = client.getWidget("DroplistIncidentID");

        client.execute({},"jp.co.vantiq.AuditLogManager.getIncidentIDs",function(response)
        {
            DroplistIncidentID.enumeratedList = response;
        });    

    }
    

    function BuildMapFilter(client)
    {
        var DroplistLevel = client.getWidget("DroplistLevelMap");
        var DroplistStatus = client.getWidget("DroplistStatusMap");
        var InputStringSearch = client.getWidget("InputStringSearchMap");

        var filters = [];
        var filter = {};

        if (DroplistLevel.boundValue != "All"){
            filters.push({"incident_level": DroplistLevel.boundValue});
        }

        if (DroplistStatus.boundValue == "Open"){
            filters.push({"is_open": true});
        } else if (DroplistStatus.boundValue == "Closed"){
            filters.push({"is_open": false});
        }

        if (InputStringSearch.boundValue != ""){
            filters.push({"incident_type" : {
                 "$regex": InputStringSearch.boundValue,
                "$options": "i"
            }});
        }

        if (filters.length > 1){
            filter = {"$and": filters};
        } else if (filters.length == 1){
            filter = filters[0];
        }        

        var ds = client.getDataStreamByName("tqIncidents");
        var p = new TimedQueryParameters();

        p.whereClause = filter;

        client.modifyTimedQuery(ds,p);

        return filter;

    }    

    function ClearMapFilter(client){

        var DroplistLevel = client.getWidget("DroplistLevelMap");
        DroplistLevel.boundValue = "All";
        var DroplistStatus = client.getWidget("DroplistStatusMap");
        DroplistStatus.boundValue = "All";
        var InputStringSearch = client.getWidget("InputStringSearchMap");
        InputStringSearch.boundValue = "";

        return {};
    }    
