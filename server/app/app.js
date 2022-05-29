
   var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
   var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww";

    var inizio_viaggio;
    var fine_viaggio;

    mapboxgl.accessToken = mapBoxAT;
    var map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        zoom: 8
    });

    $.ajax({
        type: "POST",
        url: "http://localhost:3000/formdata",
        success: function(data) {
            let lat=data.lat;
            let lon=data.lon;
            inizio_viaggio=Date.parse(data.inizio);
            fine_viaggio=Date.parse(data.fine);
            let loop=new Date(inizio_viaggio);
            let url = 'http://localhost:3000/weather'
            $.ajax({
                type:"GET",
                url:url,
                success:function (forecast){
                            console.log(forecast)
                            while(loop<=fine_viaggio){
                                let i =0
                                dailyPlanner(loop,forecast);
                                let newDate=loop.setDate(loop.getDate()+1);
                                loop=new Date(newDate);
                            }
                },error:function(error){
                    console.log(error)
                }
        })
            map.setCenter([lon, lat]);
        },
        error: function() {
            alert('error')
        }
    });

    map.addControl(new mapboxgl.NavigationControl());

    var sendbtn=document.getElementById("send");
    sendbtn.addEventListener("click", sendToServer);

    var addBtn=document.getElementById("addDay");
    addBtn.addEventListener("click", addButton)

    var btn=document.getElementById("buttons").getElementsByTagName("button");
    for(i=0; i<btn.length; i++){
        btn[i].addEventListener("click", showLayer)
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
    
            map.setPaintProperty("OTM-pois-"+name, 'circle-color', wichKind(name))
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
                    url: "http://localhost:3000/poinfo",
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

    function dailyPlanner(date, forct){
        let d=date.getDate();
        let m=date.getMonth()+1;
        let y=date.getFullYear();
        let day=document.createElement("div");
        day.innerHTML="<div class='date'><d>"+d+"</d>/<m>"+m+"</m>/<y>"+y+"</y></div>";
        day.firstChild.innerHTML+="<button value='off' type='button' onclick=showPOI(this) class='show input_style_sm'></button>";
        let last_forecast = new Date((forct.daily[7].dt)*1000)
        if((last_forecast.getDate() >= date.getDate() && last_forecast.getMonth() ==date.getMonth()) || ( last_forecast.getMonth() > date.getMonth())){
            let tripIndex = findTripIndex(date,forct)
            let forecast = forct.daily[tripIndex[0]]
            day.firstChild.innerHTML+=`<div class="forecast" onclick=showForecastPopup(this) onmouseleave=hideForecastPopup(this)>
                                        <img src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="weather icon" class="w-icon">
                                        <span class="forecastPopup">Day : ${forecast.temp.day}&#176;C Night : ${forecast.temp.night}&#176;C</span>
                                        </div>`
        }else{
            if(date.getDate() > 7){
                day.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
                        <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
                        <span class="not_forecastPopup">Weather forecast not available for this date</span>
                    </div>`
            }else{
                avaiable_forecast = 31 - (7-date.getDate())
                day.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
                                            <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
                                            <span class="not_forecastPopup">Weather forecast not available for this date</span>
                                        </div>`
            }
        }
        day.classList.add("day");
        document.getElementById("days").appendChild(day);
        day.addEventListener('drop', handleDrop);
        day.addEventListener('dragover', allowDrop);
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
        poi.innerHTML += "<p><a target='_blank' href='"+ data.wikipedia + "'>Show more on Wikipedia</a></p>";
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
            e.value='on'
            e.style.backgroundImage="url(./icons/eye-slash-fill.svg)"

            let popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
            });
        
            map.on("mouseenter", "day", function(e) {
                map.getCanvas().style.cursor = "pointer";
                let coordinates = e.features[0].geometry.coordinates.slice();
                let poiname = e.features[0].properties.name;
                popup
                    .setLngLat(coordinates)
                    .setHTML("<strong>" + poiname + "</strong>")
                    .addTo(map);
            });
        
            map.on("mouseleave", "day", function () {
                map.getCanvas().style.cursor = "";
                popup.remove();
            });
        }
    }

    function sendToServer(e){
        let toSend=[];
        let days=document.getElementsByClassName("day");
        for(i=0; i<days.length; i++){
            let tmp=[];
            let values=days[i].getElementsByClassName("poi");
            tmp.push({"day" : i});
            for(j=0; j<values.length; j++){
                tmp.push({id : $(values[j]).data().xid});
            }
            toSend.push(tmp);
        }
        var valuesToSend=JSON.stringify(toSend);
        $.ajax({
            type: "POST",
            url: "http://localhost:3000/addpois",
            dataType: "json",
            data: {
                info: valuesToSend
            },
            success: function(data) {
                alert("success")
            },
            error: function() {
                alert('error')
            }
        });
    }

    function addButton(e){
        let days=document.getElementById("days");
        let lastday=days.lastChild;
        let lastdate=lastday.firstChild;
        var day=parseInt(lastdate.getElementsByTagName("d")[0].innerHTML);
        var month=parseInt(lastdate.getElementsByTagName("m")[0].innerHTML);
        var year=parseInt(lastdate.getElementsByTagName("y")[0].innerHTML);
        //alert(day+"/"+month+"/"+year);
        var newDay=day;
        var newMonth=month;
        var newYear=year;
        if(month==12 && day==31){
            newYear+=1;
            newMonth=1;
            newDay=1;
        }else if((month==4||month==6||month==9||month==11) && day==30){
            newMonth+=1;
            newDay=1;
        }else if((month==1||month==3||month==5||month==7||month==8||month==10) && day==31){
            newMonth+=1;
            newDay=1;
        }else if(month==2 && day==28){
            newMonth+=1;
            newDay=1;
        }else{
            newDay+=1;
        }
        date=Date.parse(newYear+"-"+newMonth+"-"+newDay);
        var newDate=new Date(date);
        let url = 'http://localhost:3000/weather'
        $.ajax({
            type:"GET",
            url:url,
            success:function (forecast){
                console.log(forecast);
                addNewDay(newDate, forecast, newDay, newMonth, newYear);
            },error:function(error){
                console.log(error)
            }
        })
    }

    function addNewDay(date, forct, newDay, newMonth, newYear){
        let newDayCard=document.createElement("div");
        newDayCard.innerHTML="<div class='date'><d>"+newDay+"</d>/<m>"+newMonth+"</m>/<y>"+newYear+"</y></div>";
        newDayCard.firstChild.innerHTML+="<button value='off' type='button' onclick=showPOI(this) class='show input_style_sm'></button>";
        let last_forecast = new Date((forct.daily[7].dt)*1000)
        if((last_forecast.getDate() >= newDay && last_forecast.getMonth() ==newMonth-1) || ( last_forecast.getMonth() > newMonth-1)){
            let tripIndex = findTripIndex(date,forct)
            let forecast = forct.daily[tripIndex[0]]
            newDayCard.firstChild.innerHTML+=`<div class="forecast" onclick=showForecastPopup(this) onmouseleave=hideForecastPopup(this)>
                                        <img src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="weather icon" class="w-icon">
                                        <span class="forecastPopup">Day : ${forecast.temp.day}&#176;C Night : ${forecast.temp.night}&#176;C</span>
                                        </div>`
        }else{
            if(newDay > 7){
                newDayCard.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
                        <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
                        <span class="not_forecastPopup">Weather forecast not available for this date</span>
                    </div>`
            }else{
                avaiable_forecast = 31 - (7-newDay)
                newDayCard.firstChild.innerHTML+=`<div class="not_forecast" onclick=showNotForecastPopup(this) onmouseleave=hideNotForecastPopup(this)>
                                            <img src="./icons/cloud-slash.svg" alt="weather icon" class="w-icon">
                                            <span class="not_forecastPopup">Weather forecast not available for this date</span>
                                        </div>`
            }
        }
                
    newDayCard.classList.add("day");
    days.appendChild(newDayCard);
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
    
