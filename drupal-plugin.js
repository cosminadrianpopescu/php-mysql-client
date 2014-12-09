var $_GET = {};

document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function(){
    function decode(s){
        return decodeURIComponent(s.split("+").join(" "));
    }

    $_GET[decode(arguments[1])] = decode(arguments[2]);
})

function drupal_transform(command){
    var pref = '';
    if (typeof($_GET.pref) != 'undefined'){
        pref = $_GET.pref;
    }

    command = command.replace(/\{([a-zA-Z_0-9]+)\}/g, pref + '$1');
    command = command.replace(/%%/g, '%');
    return command;
}
