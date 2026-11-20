    // clearText()

    if (extra.obj.prompt.toUpperCase() == "EXIT"){
        client.closePopup();     
    }
    
    var messageHistory = this.getMessages();
    extra.obj.step = client.data.currentIncident.step;
    extra.obj.data = client.data.currentIncidentData; 
    extra.obj.lastMessage = messageHistory[messageHistory.length-1];
