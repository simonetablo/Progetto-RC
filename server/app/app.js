
   var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
   var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww"

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
            while(loop<=fine_viaggio){
                dailyPlanner(loop);
                let newDate=loop.setDate(loop.getDate()+1);
                loop=new Date(newDate);
            }
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
    
    function dailyPlanner(date){
        let d=date.getDate();
        let m=date.getMonth()+1;
        let y=date.getFullYear();
        let day=document.createElement("div");
        day.innerHTML="<date>"+d+"/"+m+"/"+y+"<date/>";
        day.setAttribute("id",  day.getElementsByTagName("date").innerHTML);
        day.classList.add("day");
        document.getElementById("days").appendChild(day);
        day.addEventListener('drop', handleDrop);
        day.addEventListener('dragover', allowDrop);
    }

    function showInfo(data) {
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
        poi.innerHTML += "<button id='add' type='button' class='btn btn-primary btn-sm'>add to your travel</button>";
        var info=document.getElementById('info');
        info.innerHTML="";
        info.appendChild(poi);
        document.getElementById("add").addEventListener("click", function(){
            let planner=document.createElement("div");
            planner.classList.add("poi");
            planner.setAttribute('draggable', true);
            $(planner).data(data);
            planner.innerHTML=data.name;
            planner.innerHTML+="<button onclick='this.parentElement.remove()' class='remove btn btn-light'></button>";
            document.getElementById("days").firstChild.appendChild(planner); 
            planner.addEventListener("dragstart", handleDragStart);
            planner.addEventListener("dragleave", handleDragLeave);
            planner.addEventListener("dragend", handleDragEnd)
            planner.addEventListener('drop', handleDrop);
            planner.addEventListener('dragover', allowDrop);
        });
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
            var clone=dragging.cloneNode(true);
            clone.style.opacity='';
            $(clone).data($(dragging).data());
            clone.addEventListener("dragstart", handleDragStart);
            clone.addEventListener("dragleave", handleDragLeave);
            clone.addEventListener("dragend", handleDragEnd)
            clone.addEventListener('drop', handleDrop);
            clone.addEventListener('dragover', allowDrop);
            e.target.appendChild(clone);
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
