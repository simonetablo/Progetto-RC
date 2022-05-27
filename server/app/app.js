
   var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
   var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww"
   var OpenWeatherApiKey = 'd3099b58cf87b418252edf98f8b3a3fb'

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
            let url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=hourly,minutely&units=metric&appid=${OpenWeatherApiKey}`
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
            //map.flyTo({center: [lon, lat], zoom: 9});
        },
        error: function() {
            alert('error')
        }
    });

    map.addControl(new mapboxgl.NavigationControl());

    var sendbtn=document.getElementById("send");
    sendbtn.addEventListener("click", sendToServer);

    var cont=document.getElementById("buttons");
    var btn=cont.getElementsByTagName("button");
    for(i=0; i<btn.length; i++){
        btn[i].addEventListener("click", showLayer)
    }

    function showLayer(e){
        var name=this.id;
        if(this.value=="on"){
            map.setLayoutProperty("OTM-pois-"+name, "visibility", "none");
            this.value='off'
        }
        else if(this.value=="off"){
            map.setLayoutProperty("OTM-pois-"+name, "visibility", "visible");
            this.value='on'
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
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(255, 51, 0)")
            }
            if(name=="religion"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(255, 204, 0)")
            }
            if(name=="natural"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(102, 153, 0)")
            }
            if(name=="museums"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(51, 153, 255)")
            }
            if(name=="architecture"){
                map.setPaintProperty("OTM-pois-"+name, 'circle-color', "rgb(255, 51, 204)")
            }

            map.on("click", "OTM-pois-"+name, function(e) {
                //let coordinates = e.features[0].geometry.coordinates.slice();
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



    function dailyPlanner(date,forct){
        let d=date.getDate();
        let m=date.getMonth()+1;
        let y=date.getFullYear();
        let day=document.createElement("div");
        day.innerHTML="<date>"+d+"/"+m+"/"+y+"<date/>";
        day.innerHTML+="<button value='off' type='button' onclick=showPOI(this) class='show btn btn-primary btn-sm'></button>";
        let last_forecast = new Date((forct.daily[7].dt)*1000)
        if((last_forecast.getDate() >= date.getDate() && last_forecast.getMonth() ==date.getMonth()) || ( last_forecast.getMonth() > date.getMonth())){
            let tripIndex = findTripIndex(date,forct)
            let forecast = forct.daily[tripIndex[0]]
            day.innerHTML+=`<div class=forecast><forecast>
                                <img src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="weather icon" class="w-icon">
                                <div class="temp">Day : ${forecast.temp.day}&#176;C</div>
                                <div class="temp">Night : ${forecast.temp.night}&#176;C</div>
                                <forecast></forecast>
                            </forecast></div>
                            `
        }
        day.setAttribute("id",  day.getElementsByTagName("date").innerHTML);
        day.classList.add("day");
        document.getElementById("days").appendChild(day);
        day.addEventListener('drop', handleDrop);
        day.addEventListener('dragover', allowDrop);
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
        poi.innerHTML += "<button id='add' type='button' onclick=addToPlanner(this) class='btn btn-primary btn-sm'>add to your travel</button>";
        $(poi).data(data);
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
        planner.innerHTML=data.name;
        planner.innerHTML+="<button onclick='this.parentElement.remove()' class='remove btn btn-light'></button>";
        planner.innerHTML+="<button onclick=clonePOI(this) class='clone btn btn-light'></button>";
        planner.innerHTML+="<button onclick=showInfo(this) class='infobtn btn btn-light'></button>";
        document.getElementById("days").firstChild.appendChild(planner); 
        planner.addEventListener("dragstart", handleDragStart);
        planner.addEventListener("dragleave", handleDragLeave);
        planner.addEventListener("dragend", handleDragEnd)
        planner.addEventListener('drop', handleDrop);
        planner.addEventListener('dragover', allowDrop);
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
                }
            }
            var pois=e.parentNode.getElementsByClassName("poi");
            var geoJson={
                type: "FeatureCollection",
                features: []
            }
            for(j=0; j<pois.length; j++){
                let datastring=JSON.stringify($(pois[j]).data());
                let data=JSON.parse(datastring);
                let lon=data.point.lon;
                let lat=data.point.lat;
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
                target.style['border-bottom']='solid 4px blue';
                target.style['border-top']='';
            }else{
                target.style['border-top']='solid 4px blue';
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
    
