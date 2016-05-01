$(document).ready(function() {

 

    $("#confirmation-submit").click(function(e) {
        $.post("/confirmation", {"confirmation": $("#confirmation-tick").val()})
        .done(function(string) {
            location.reload();
        });
        e.preventDefault();
    });

});