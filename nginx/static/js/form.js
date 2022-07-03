//la ricerca di itinerari viene effettuata tramite una chiamata asincrona al server che restituisce i relativi dati filtrati presenti nel database

var base_url = window.location.origin;

$(window).on('load', function () {

    $("#logout_button").click(function () {
        $.post(base_url + "/logout", () => {
            window.location = base_url;
        });
    });

    $(".tag").on('click', (event) => {
        target = event.target;
        if (!target.classList.contains("tag")) {
            target = target.parentNode;
        }
        $(".background_image").attr("src", "../media/form_images/" + target.id + "_image.png");
        if (target.classList.length == 2) {
            target.classList.remove(target.classList[1]);
            target.childNodes[1].checked = false;
            console.log(target.childNodes[1].value);
        }
        else {
            target.classList.add("tag_color_" + target.id);
            target.childNodes[1].checked = true;
            console.log(target.childNodes[1]);
        }
    });

    $(".tag").on('mouseleave', (event) => {
        target = event.target;
        if (!target.classList.contains("tag")) {
            target = target.parentNode;
        }
        $("#tag_label").css("opacity", "0");
    })

    $(".tag").on('mouseover', (event) => {
        target = event.target;
        if (!target.classList.contains("tag")) {
            target = target.parentNode;
        }
        $(".background_image").attr("src", "../media/form_images/" + target.id + "_image.png");
        $("#tag_label").html(target.id);
        $("#tag_label").css("opacity", "100");
    });

    form = document.getElementById('form');
    form.addEventListener('submit', function (event) {
        $("#itineraries").html('<i class="fa-solid fa-ellipsis" style="color:#cad2d3"></i>');
        event.preventDefault();
        event.stopPropagation();
        formData = new FormData(this);
        const data = [...formData.entries()];
        const query_string = data.map(x => `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`).join('&');
        get_url = base_url + '/api/itineraries?' + query_string;
        $.get(get_url, (res) => {
            console.log(res)
            res.data.forEach((itinerary, i) => {
                console.log(itinerary);
                title = itinerary.title;
                author = itinerary.author;
                tags = itinerary.tags;
                html_tags = "";
                for (const tag of tags) {
                    if (tag == "architecture") html_tags += '<i class="fa-solid tag_color_architecture fa-archway" style="padding-left:3px"></i>';
                    else if (tag == "cultural") html_tags += '<i class="fa-solid fa-book-open tag_color_cultural" style="padding-left:3px"></i>';
                    else if (tag == "foods") html_tags += '<i class="fa-solid fa-utensils tag_color_foods" style="padding-left:3px"></i>';
                    else if (tag == "hotel") html_tags += '<i class="fa-solid fa-bed tag_color_hotel" style="padding-left:3px"></i>';
                    else if (tag == "natural") html_tags += '<i class="fa-solid fa-tree tag_color_natural" style="padding-left:3px"></i>';
                    else if (tag == "religion") html_tags += '<i class="fa-solid fa-hands-praying tag_color_religion" style="padding-left:3px"></i>';
                }
                $("#itineraries").append(`<div class="d-flex card_itinerary p-2 justify-content-between m-3">
				<div class="d-flex text-start align-items-center mx-3">
					<div>
						<h5 class="card-title small m-0 mb-2">${title}</h5>
						<p class="card-text small">by: ${author}</p>
					</div>
				</div>
				<div class="text-end align-items-end d-flex flex-column p-2 mx-3"  >
						<a href="${base_url + '/planner?id=' + itinerary.id+'&name='+title+'&author=' + author}"><button class="input_style_small mx-2 mb-2">View</button></a>
						<div>
							${html_tags}   
						</div>                                            
				</div>
			</div>`)
            });
        });
    });
});