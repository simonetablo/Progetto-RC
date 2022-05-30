
   var base_url = window.location.origin;
   
   var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
   var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww";

    var inizio_viaggio;
    var fine_viaggio;

    mapboxgl.accessToken = mapBoxAT;
    var map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/dark-v10",
        zoom: 8
    });

    //$.ajax({
    //    type: "POST",
    //    url: "http://localhost:3000/formdata",
    //    success: function(data) {
    //        let lat=data.lat;
    //        let lon=data.lon;
    //        inizio_viaggio=Date.parse(data.inizio);
    //        fine_viaggio=Date.parse(data.fine);
    //        let loop=new Date(inizio_viaggio);
    //        let url = 'http://localhost:3000/weather'
    //        $.ajax({
    //            type:"GET",
    //            url:url,
    //            success:function (forecast){
    //                        console.log(forecast)
    //                        while(loop<=fine_viaggio){
    //                            let i =0
    //                            dailyPlanner(loop,forecast);
    //                            let newDate=loop.setDate(loop.getDate()+1);
    //                            loop=new Date(newDate);
    //                        }
    //            },error:function(error){
    //                console.log(error)
    //            }
    //    })
    //        map.setCenter([lon, lat]);
    //    },
    //    error: function() {
    //        alert('error')
    //    }
    //});

    map.addControl(new mapboxgl.NavigationControl());

    var sendbtn=document.getElementById("send");
    sendbtn.addEventListener("click", sendToServer);

    var btn=document.getElementById("buttons").getElementsByTagName("button");
    for(i=0; i<btn.length; i++){
        btn[i].addEventListener("click", showLayer)
    }

    days = document.getElementsByClassName("day");
    for(i=0; i<days.length; i++){
        days[i].addEventListener('drop', handleDrop);
        days[i].addEventListener('dragover', allowDrop);
    }

    pois = document.getElementsByClassName("poi");
    for(i=0; i<pois.length; i++){
        pois[i].addEventListener("dragstart", handleDragStart);
        pois[i].addEventListener("dragleave", handleDragLeave);
        pois[i].addEventListener("dragend", handleDragEnd);
        pois[i].addEventListener('drop', handleDrop);
        pois[i].addEventListener('dragover', allowDrop);
    }

    function showLayer(e){
        var name=this.id;
        if(this.value=="on"){
            map.setLayoutProperty("OTM-pois-"+name, "visibility", "none");
            this.value='off'
            this.style.background="rgb(250, 250, 250)";
        }
        else if(this.value=="off"){
            map.setLayoutProperty("OTM-pois-"+name, "visibility", "visible");
            this.value='on'
            this.style.background="rgb(210, 210, 210)";
        }
        else{
            this.value='on'
            map.addLayer({
                id: "OTM-pois-"+name,
                type: "circle",
                source: {
                    type: "vector",
                    tiles: ["https://api.opentripmap.com/0.1/en/tiles/pois/{z}/{x}/{y}.pbf?kinds="+name+"&rate=2&apikey=" + OpenTripMapKey]
                },
                layout: {
                    "visibility" : "visible"
                },
                paint: {
                    "circle-radius": 5,
                    "circle-stroke-width": 0.6
                },
                "source-layer": "pois",
            });
            if(name=="foods"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(158, 0, 34)")
            }
            if(name=="religion"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(214, 180, 29)")
            }
            if(name=="natural"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(11, 116, 28)")
            }
            if(name=="museums"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(0, 168, 197)")
            }
            if(name=="architecture"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(123, 14, 138)")
            }
            if(name=="accomodations"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(20, 18, 100)")
            }
            this.style.background="rgb(210, 210, 210)";
            map.on("click", "OTM-pois-"+name, function(e) {
                let id = e.features[0].properties.id;
                let poiname = e.features[0].properties.name;
                var datatoserver={
                    name:poiname,
                    id:id
                }
                var dataString=JSON.stringify(datatoserver);
                $.ajax({
                    type: "POST",
                    url: base_url + "/poinfo",
                    dataType: "json",
                    data: {
                        info: dataString
                    },
                    success: function(data) {
                        showInfo(data)
                    },
                    error: function() {
                        alert('error')
                    }
                });
            });
        
            let popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
            });
        
            map.on("mouseenter", "OTM-pois-"+name, function (e) {
                map.getCanvas().style.cursor = "pointer";
                let coordinates = e.features[0].geometry.coordinates.slice();
                let id = e.features[0].properties.id;
                let poiname = e.features[0].properties.name;
                popup
                    .setLngLat(coordinates)
                    .setHTML("<strong>" + poiname + "</strong>")
                    .addTo(map);
            });
        
            map.on("mouseleave", "OTM-pois-"+name, function () {
                map.getCanvas().style.cursor = "";
                popup.remove();
            });   
        }
    };


    function findTripIndex(data,forecast){
        let tripIndex = []
        for(i in forecast.daily){
            f_date = new Date((forecast.daily[i].dt)*1000)
            console.log(f_date)
            if( f_date.getDate()  == data.getDate() && f_date.getMonth() == data.getMonth()){
                tripIndex.push(i)
            }
        }
        console.log(tripIndex)
        return tripIndex
    }
    


    //function dailyPlanner(date, forct){
    //    
    //    let d=date.getDate();
    //    let m=date.getMonth()+1;
    //    let y=date.getFullYear();
    //    let day=document.createElement("div");
    //    day.innerHTML="<div class='date'>"+d+"/"+m+"/"+y+"</div>";
    //    day.firstChild.innerHTML+="<button value='off' type='button' onclick=showPOI(this) class='show input_style_sm'></button>";
    //    let last_forecast = new Date((forct.daily[7].dt)*1000)
    //    if((last_forecast.getDate() >= date.getDate() && last_forecast.getMonth() ==date.getMonth()) || ( last_forecast.getMonth() > date.getMonth())){
    //        let tripIndex = findTripIndex(date,forct)
    //        let forecast = forct.daily[tripIndex[0]]
    //        day.firstChild.innerHTML+=`<div class="forecast" onclick=showForecastPopup(this) onmouseleave=hideForecastPopup(this)>
    //                                    <img src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="weather icon" class="w-icon">
    //                                    <span class="forecastPopup">Day : ${forecast.temp.day}&#176;C Night : ${forecast.temp.night}&#176;C</span>
    //                                    </div>`
    //    }else{
    //        if(date.getDate() > 7){
    //            day.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
    //                    <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
    //                    <span class="not_forecastPopup">Previsioni Meteo non disponibili per questa data</span>
    //                </div>`
    //        }else{
    //            avaiable_forecast = 31 - (7-date.getDate())
    //            day.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
    //                                        <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
    //                                        <span class="not_forecastPopup">Previsioni Meteo non disponibili per questa data</span>
    //                                    </div>`
    //        }
    //    }
    //    day.setAttribute("id",  day.getElementsByTagName("date").innerHTML);
    //    day.classList.add("day");
    //    document.getElementById("days").appendChild(day);
    //    day.addEventListener('drop', handleDrop);
    //    day.addEventListener('dragover', allowDrop);
    //}



    function getForecast(date_element){
        var currentTime = new Date();
        date = new Date(date_element.value);
        difference = Math.ceil((date-currentTime)/ (1000 * 3600 * 24));
        forecast_element = date_element.nextElementSibling;
        $.ajax({
            type:"GET",
            url:base_url+'/weather',
            success:function (forct){
                        if(difference >= 0 && difference <= 7){   
                            let forecast = forct.daily[difference]
                            forecast_element.setAttribute("onclick", "showForecastPopup(this)");
                            forecast_element.setAttribute("onmouseleave", "hideForecastPopup(this)");
                            forecast_element.innerHTML=`<img src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="weather icon" class="w-icon2">
                                                        <span class="forecastPopup">Day : ${forecast.temp.day}&#176;C Night : ${forecast.temp.night}&#176;C</span>`
                        }else{
                            forecast_element.setAttribute("onclick", "showNotForecastPopup(this)");
                            forecast_element.setAttribute("onmouseleave", "hideNotForecastPopup(this)");
                            forecast_element.innerHTML=`<i class="fa-solid fa-circle-exclamation mx-2"></i>
                                                        <span class="not_forecastPopup">Previsioni Meteo non disponibili per questa data</span>`
                        }
            },error:function(error){
                console.log(error)
            }
        });
    }

    function showForecastPopup(e){
        let popup=e.getElementsByClassName("forecastPopup")[0];
        if(popup.style.visibility=="visible"){popup.style.visibility="hidden";}
        else{popup.style.visibility="visible";}
    }

    function hideForecastPopup(e){
        let popup=e.getElementsByClassName("forecastPopup")[0];
        popup.style.visibility="hidden";
    }

    function showNotForecastPopup(e){
        let popup=e.getElementsByClassName("not_forecastPopup")[0];
        if(popup.style.visibility=="visible"){popup.style.visibility="hidden";}
        else{popup.style.visibility="visible";}
    }

    function hideNotForecastPopup(e){
        let popup=e.getElementsByClassName("not_forecastPopup")[0];
        popup.style.visibility="hidden";
    }

    function showInfo(obj) {
        if(obj instanceof HTMLElement){ 
            let datastring=JSON.stringify($(obj.parentNode).data());
            var data=JSON.parse(datastring);
        }else{
            var data=obj;
        }
        let poi = document.createElement("div");
        poi.classList.add("info");
        poi.innerHTML = "<h2>" + data.name + "<h2>";
        poi.innerHTML += "<p><i>" + getCategoryName(data.kinds) + "</i></p>";
        if (data.preview) {
            poi.innerHTML += "<img src='"+data.preview.source+"'>";
        }
        poi.innerHTML += data.wikipedia_extracts
            ? data.wikipedia_extracts.html
            : data.info
                ? data.info.descr
                : "No description";
        poi.innerHTML += "<p><a target='_blank' href='"+ data.otm + "'>Show more at OpenTripMap</a></p>";
        poi.innerHTML += "<button id='add' type='button' onclick=addToPlanner(this) class='input_style_sm'>add to your travel</button>";
        $(poi).data(data);
        poi.style.borderTopColor=wichKind(data.kinds);
        var info=document.getElementById('info');
        info.innerHTML="";
        info.appendChild(poi);
    }

    function addToPlanner(e){
        let planner=document.createElement("div");
        planner.classList.add("poi");
        planner.setAttribute('draggable', true);
        data=$(".info").data();
        $(planner).data(data);
        planner.innerHTML="<div class='name'>"+data.name+"</div>";
        planner.innerHTML+="<button onclick='this.parentElement.remove()' class='remove btn btn-light'></button>";
        planner.innerHTML+="<button onclick=clonePOI(this) class='clone btn btn-light'></button>";
        planner.innerHTML+="<button onclick=showInfo(this) class='infobtn btn btn-light'></button>";
        planner.style.borderLeftColor=wichKind(data.kinds);
        console.log( document.getElementById("days").firstChild)
        document.getElementById("days").firstChild.appendChild(planner); 
        planner.addEventListener("dragstart", handleDragStart);
        planner.addEventListener("dragleave", handleDragLeave);
        planner.addEventListener("dragend", handleDragEnd)
        planner.addEventListener('drop', handleDrop);
        planner.addEventListener('dragover', allowDrop);
    }

    function wichKind(kind){
        if(kind.includes("museums")) return("rgb(0, 168, 197)");
        else if(kind.includes("foods")) return("rgb(158, 0, 34)");
        else if(kind.includes("religion")) return("rgb(214, 180, 29)");
        else if(kind.includes("natural")) return("rgb(11, 116, 28)");
        else if(kind.includes("architecture")) return("rgb(123, 14, 138)");
        else if(kind.includes("accomodations")) return("rgb(20, 18, 100)");
    }

    function showPOI(e){
        if(e.value=='on'){
            map.removeLayer('day');
            map.removeSource('day');
            e.value='off';
            e.style.backgroundImage="url(./icons/eye-fill.svg)";
        }
        else{
            var layers=document.getElementsByClassName("filter");
            for(i=0; i<layers.length; i++){
                if(layers[i].value=="on"){
                    map.setLayoutProperty("OTM-pois-"+layers[i].id, "visibility", "none");
                    layers[i].value="off";
                    layers[i].style.background="rgb(250, 250, 250)"
                }
            }
            let parent=e.parentNode;
            var pois=parent.parentNode.getElementsByClassName("poi");
            var geoJson={
                type: "FeatureCollection",
                features: []
            }
            for(j=0; j<pois.length; j++){
                let datastring=JSON.stringify($(pois[j]).data());
                let data=JSON.parse(datastring);
                geoJson.features.push({
                    "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [data.point.lon, data.point.lat]
                        },
                        "properties": {
                            "name": data.name
                        }
                });
            }
            map.addSource('day', {
                type: 'geojson',
                data: geoJson
            })
            map.addLayer({
                id: "day",
                type: "circle",
                source: 'day',
                layout: {
                    "visibility" : "visible"
                },
                paint: {
                    "circle-radius": 5,
                    "circle-stroke-width": 0.6
                },
            });
            console.log(JSON.stringify(geoJson));
            e.value='on'
            e.style.backgroundImage="url(./icons/eye-slash-fill.svg)"
        }
    }

    function sendToServer(e){
        let day_elements=document.getElementsByClassName("day");
        let days=[];
        for(i=0; i<day_elements.length; i++){ 
            let values=day_elements[i].getElementsByClassName("poi");
            let plan=[];
            for(j=0; j<values.length; j++){
                poi_obj = { id: $(values[j]).data().xid}
                plan.push(poi_obj);
            }
            day_obj = {plan : plan}
            days.push(day_obj);
        }
        itinerary_obj = {itinerary : days };
        $.post( base_url+"/api/itineraries", itinerary_obj);
    }

    var dragging=null;

    function handleDragStart(e){
        dragging=e.target
        this.style.opacity='0.4';
        e.dataTransfer.setData("text/html", dragging);
    }

    function handleDragEnd(){
        this.style.opacity='1'
    }

    function handleDrop(e){
        e.preventDefault();
        if(e.target.classList.contains("poi")){
            var target=getPOI(e.target)
            if (target.style['border-bottom'] !== '' ) {
                target.style['border-bottom'] = '';
                target.parentNode.insertBefore(dragging, e.target.nextSibling);
            } else if (target.style['border-top'] !== '' ){
                target.style['border-top'] = '';
                target.parentNode.insertBefore(dragging, e.target);
            }
        }else if(e.target.classList.contains("day")){
            e.target.appendChild(dragging);
        }
    }

    function allowDrop(e){
        e.preventDefault();
        if(e.target.classList.contains("poi")){
            var target=getPOI(e.target)
            var bounding=target.getBoundingClientRect();
            var offset=bounding.y+(bounding.height/2);
            if(e.clientY-offset>0){
                target.style['border-bottom']='solid 4px rgb(82, 82, 82)';
                target.style['border-top']='';
            }else{
                target.style['border-top']='solid 4px rgb(82, 82, 82)';
                target.style['border-bottom']='';
            }
        }
    }

    function handleDragLeave(e){
        e.target.style["border-bottom"]="";
        e.target.style["border-top"]="";
    }

    function getPOI(target){
        while(target.parentNode.classList.contains("poi")){
            target=target.parentNode;
        }
        if(target.classList.contains("poi")){
            return target;
        }
        else{return false;}
    }

    function clonePOI(e){
        var poi=e.parentNode;
        var day=poi.parentNode;
        var clone=poi.cloneNode(true);
        $(clone).data($(poi).data());
        clone.addEventListener("dragstart", handleDragStart);
        clone.addEventListener("dragleave", handleDragLeave);
        clone.addEventListener("dragend", handleDragEnd)
        clone.addEventListener('drop', handleDrop);
        clone.addEventListener('dragover', allowDrop);
        day.appendChild(clone);
    }

    $("#create").on('click', () => {
        let day=document.createElement("div");
        day.innerHTML = `<div class="date d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <input type="date" class="input_style_sm my-1" oninput="getForecast(this)"><div class="text-start" onclick="showNotForecastPopup(this)" onmouseleave="hideNotForecastPopup(this)">
                <i class="fa-solid fa-circle-exclamation mx-2"></i>
                <span class="not_forecastPopup">Previsioni Meteo non disponibili per questa data</span>
            </div>
        </div>
        <button value="off" type="button" onclick="showPOI(this)" class="show input_style_sm mx-1"></button>
        </div>`
        day.classList.add("day")
        day.classList.add("bg-dark")
        day.addEventListener('drop', handleDrop);
        day.addEventListener('dragover', allowDrop);
        $("#days").append(day);
    });