function showPOI(){
    var layers=map.getStyle().layers;
    for(i=0; i<layers.length; i++){
        map.setLayoutProperty("OTM-pois-"+layers[i].id, "visibility", "none");
    }
}

"<div class='btn-group-toggle' data-toggle='buttons'><label class='btn btn-secondary active'><input type='checkbox' checked autocomplete='off'> </label></div>"
'<button type="button" class="btn btn-primary" data-toggle="button" aria-pressed="false" autocomplete="off">Single toggle</button>'
