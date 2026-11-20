
    //console.log(data);
/*    for (let i = 0; i < data.length; i++){
        var args = {"incident": data[i].incident_id};
        const item = data[i];
        client.execute(args,"jp.co.vantiq.Telegram.getNextReminder",function(response)
        {
            item.reminder = response;  

        });    
    }
*/
    const now = new Date();
    client.getWidget("StaticTextLastUpdate").text = now.toLocaleTimeString(); 
    client.execute({},"jp.co.vantiq.UIEventBridger.getIncidensCounts",function(response)
    {
        client.getWidget("StaticTextAllCount").text = response.all;
        client.getWidget("StaticTextOpenCount").text = response.open;
        client.getWidget("StaticTextClosedCount").text = response.closed;
    });
