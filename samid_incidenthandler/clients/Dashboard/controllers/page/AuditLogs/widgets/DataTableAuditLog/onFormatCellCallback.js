    if (extra.columnName == "Descript"){
        if (extra.dataObject.hasOwnProperty('log_content')){
            extra.cellValue = extra.dataObject.log_content.description;
        }else if (extra.dataObject.hasOwnProperty('input_snapshot')) {
             extra.cellValue = "Processing...";

        } else if (extra.dataObject.hasOwnProperty('output_snapshot')) {
            extra.cellValue = extra.dataObject.output_snapshot;
        }

    }


    //console.log(extra.columnName);
    if (extra.columnName == "event_type" || extra.columnName == "agent_name"){
        if (extra.cellValue != undefined){
            extra.cellValue = extra.cellValue.charAt(0).toUpperCase() + extra.cellValue.slice(1);
        }
    }