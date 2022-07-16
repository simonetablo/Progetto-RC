//Questo script gestisce i form di login e registrazione.
//La validazione avviene innanzitutto lato client e poi lato server.
//Quando i dati sono validi lato client, vengono inviati al server con una post request.
//Il server può rispondere con messaggi d'errore che vengono mostrati all'utente.
//Le classi bootstrap "was-validated" e "needs-validation" permettono di mostrare il risultato della validazione quando richiesto
//La validazione dei campi viene gestita attraverso le classi bootstrap per form "is-valid" e "is-invalid"

const url = window.location.href
        
$(window).on('load', function() {

    $("#register_button_sm").click(function(){
        $("#login_form").hide();
        $("#register_button").hide();
        $("#login_button").show();
        $("#register_form").show();
    })
    $("#login_button_sm").click(function(){
        $("#register_form").hide();
        $("#login_button").hide();
        $("#register_button").show();
        $("#login_form").show();
    })
    $("#register_button").click(function(){
        $("#login_form").hide();
        $("#register_button").hide();
        $("#login_button").show();
        $("#register_form").show();
    })
    $("#login_button").click(function(){
        $("#register_form").hide();
        $("#login_button").hide();
        $("#register_button").show();
        $("#login_form").show();
    })

    const login_form = document.getElementById('login_form');
    login_form.addEventListener('submit', function(event) {
        const login_username = document.getElementById('login_username');
        const login_password = document.getElementById('login_password');
        const login_username_f = document.getElementById('login_username_f');
        const login_password_f = document.getElementById('login_password_f');
        if (this.checkValidity() === false) {
            //login_username
            login_username.classList.remove("is-invalid");
            login_username_f.innerHTML = "Type a username";
            //login_password
            login_password.classList.remove("is-invalid");
            login_password_f.innerHTML = "Type a password";
            event.preventDefault();
            event.stopPropagation();
            this.classList.add('was-validated');
        }
        else{
            this.classList.remove('was-validated');
            event.preventDefault();
            event.stopPropagation();
            form_data = new FormData(this);
            const form_data_json = {
                "username" : form_data.get('username'),
                "password" : form_data.get('password')
            }
            $.post(url + "login", form_data_json, (data)=>{    
                if(data.status == "ok"){
                    document.location.reload(true);
                }
                else{   
                //login_username
                login_username_f.innerHTML = data.username;
                login_username.classList.add("is-invalid");
                //login_password
                login_password_f.innerHTML = data.password;
                login_password.classList.add("is-invalid");
                }
            }); 
        }
    })
    
    const register_form = document.getElementById('register_form');
    
    register_form.addEventListener('submit', function(event) {
        //register username
        const register_username = document.getElementById('register_username');
        const register_username_f = document.getElementById('register_username_f');
        //register email
        const register_email = document.getElementById('register_email');
        const register_email_f = document.getElementById('register_email_f');
        //register password 1
        const register_password_1 = document.getElementById('register_password_1');
        const register_password_1_f = document.getElementById('register_password_1_f');
        //register password 2
        const register_password_2 = document.getElementById('register_password_2');
        const register_password_2_f = document.getElementById('register_password_2_f');
        if (this.checkValidity() === false) {
            //login_username
            register_username.classList.remove("is-invalid");
            register_username_f.innerHTML = "Type a username";
            //login_email
            register_email.classList.remove("is-invalid");
            register_email_f.innerHTML = "Type a valid email";
            //login_password
            register_password_1.classList.remove("is-invalid");
            register_password_1_f.innerHTML = "Type a password";
            //login_password
            register_password_2.classList.remove("is-invalid");
            register_password_2_f.innerHTML = "Confirm password";
            event.preventDefault();
            event.stopPropagation();
            this.classList.add('was-validated');
        }
        else{
            this.classList.remove('was-validated');
            event.preventDefault();
            form_data = new FormData(this);
            if(form_data.get("password") != form_data.get("confirm_password")){
                //register_password_2
                register_password_2_f.innerHTML = "Passwords are not the same";
                register_password_2.classList.add("is-invalid");
            }
            else{
                const form_data_json = {
                    "username" : form_data.get('username'),
                    "email" : form_data.get('email'),
                    "password" : form_data.get('password')
                }
                $.post(url + "register", form_data_json, (data)=>{ 
                    if(data.status == "ok"){
                        document.location.reload(true);
                    }   
                    else{
                    //register_username
                    register_username_f.innerHTML = data.username;
                    register_username.classList.add("is-invalid");
                    //register_email
                    register_email_f.innerHTML = data.email;
                    register_email.classList.add("is-invalid");
                    //register_password_1
                    register_password_1_f.innerHTML = data.password;
                    register_password_1.classList.add("is-invalid");
                    //register_password_2
                    register_password_2_f.innerHTML = data.password;
                    register_password_2.classList.add("is-invalid");
                    }
                }); 
            }
        }
    })  
});

function blurText(e){
    if(e.classList.contains("hidden")){
        e.style.webkitFilter="blur(0px)";
        e.classList.remove("hidden");
        e.classList.add("visible");
    }
    else if(e.classList.contains("visible")){
        e.style.webkitFilter="blur(3px)";
        e.classList.remove("visible");
        e.classList.add("hidden");
    }
}

$('.dropdown-menu').on('click', function(e) {
    e.stopPropagation();
});