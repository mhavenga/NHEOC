   if (Object.hasOwn(data, "data")){
      if (Object.hasOwn(data.data, "activeLevel")){
         client.data.currentIncidentData.activeLevel = data.data.activeLevel;
   
      }

   }


   client.data.currentIncident.step++;
    