var PROMPT = typeof(localStorage['prompt']) == 'undefined' ? 'mysql> ' : localStorage['prompt'];
var DELIMITER = ';';
var TERM = null;
var PENDING = null;
var I = 0;

function escape_brackets(string) {
    return string.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
}

function getAllMatches(r, command){
    var strings = new Array();
    var matches = r.exec(command);
    while (matches != null){
        strings.push(matches[0]);
        command = command.replace(r, "#" + I + "#");
        matches = r.exec(command);
        I++;
    }

    return [strings, command];
}

function split_command(command){
    I = 0;
    var r1 = /"([^"\\]*(?:\\.[^"\\]*)*)"/;
    var r2 = /'([^'\\]*(?:\\.[^'\\]*)*)'/;

    var strings = new Array();
    var result = getAllMatches(r1, command);
    strings = result[0];
    command = result[1];

    result = getAllMatches(r2, command);
    strings = strings.concat(result[0]);
    command = result[1];

    var commands = command.split(DELIMITER);
    var r3;
    for (var i in commands){
        for (var j in strings){
            r3 = new RegExp("#" + j + "#", 'g');
            commands[i] = commands[i].replace(r3, strings[j].replace('$', '$$$$'));
        }
    }

    return commands;
}

function setAutocomplete(tables, append){
    if (typeof(append) == 'undefined' || append == null)
    {
        append = false;
    }
    if (!append)
    {
        AUTOC = tables;
    }
    else 
    {
        for (var i in tables)
        {
            AUTOC.push(tables[i]); 
        }
    }
    localStorage['auto_complete'] = JSON.stringify(AUTOC);
}

function sqlQuery(command){
    PENDING = $.jrpc('rpc-client.php', 'do-query', 'query', {command: command}, function(json){
        TERM.enable();
        if (json.error == null){
            if (typeof(json.result.auto_complete) != 'undefined'){
                setAutocomplete(json.result.auto_complete, command.match(/^[\s]*autocomplete[\s]+append/));
                TERM.echo('[[;#0f0;]' + escape_brackets('Database changed. ') + ']')
            }
            else if (typeof(json.result.table) != 'undefined' && typeof(json.result.table.length) == 'undefined'){
                displayResult(json.result.table, json.result.info);
            }
            else {
                INFO = json.result.info;
                RESULT_SET = json.result.table;
                displayInfo();
            }
        }
        else {
            TERM.error(json.error.message);
        }
        PENDING = null;
    }, 
    function(json){
        TERM.enable();
        TERM.error('Request to server failed. ');
        PENDING = null;
    });
}

$(document).ready(function(){
    var prev_command = '';
    $('body').terminal(function(command, term){
        TERM = term;
        r = /^[\s]*delimiter[\s]+([^\s]+)[\s]*$/gi;
        if (command.match(r) && prev_command == '')
        {
            DELIMITER = command.replace(r, '$1'); 
            return ;
        }


        var r = new RegExp('.*' + DELIMITER + '[\\s]*$');
        if (command.match(r)){
            command = prev_command + (prev_command == '' ? '' : '\n') + command;
            prev_command = '';
            term.set_prompt(PROMPT);
            term.disable();

            command = command.replace(/\n/g, '');
            if (command.match(/^[\s]*;[\s]*$/)){
                term.enable();
                return ;
            }

            var commands = split_command(command);
            var callback;
            for (var i in commands){
                if (!commands[i].match(/^[\s]*$/)){
                    for (var j in client_settings.pre_run_plugins){
                        if (commands[i] != false){
                            eval('callback = ' + client_settings.pre_run_plugins[j]);
                            commands[i] = callback(commands[i]);
                        }
                    }
                    if (commands[i] != false){
                        sqlQuery(commands[i]);
                    }
                    else {
                        term.enable();
                    }
                }
            }
        }
        else {
            term.set_prompt('> ');
            prev_command += (prev_command == '' ? '' : '\n') + command + ' ';
        }
    }, 
    {
        keydown: function(e, term){
            if (e.which == 67 && e.ctrlKey){
                term.error('CTRL + C was pressed.');
                PAGE_REST = false;
                term.set_prompt(PROMPT);
                prev_command = '';
                if (resultsTimeoutId != null){
                    clearTimeout(resultsTimeoutId);
                    resultsTimeoutId = null;
                }
                if (PENDING != null){
                    PENDING.abort();
                }
                term.enable();
            }

            return true;
        }, 
        tabcompletion: true, 
        auto_complete: function(command, position){
            return do_auto_complete(command, position);
        },
        onInit: function(term){
            term.set_prompt(PROMPT);
        }, 
        login: function(user, pass, callback){
            AUTOC = null;
			if (user.match(/^:/)){
				user = user.replace(/^:/g, '');
				if (typeof(connections[user]) != 'undefined'){
					user = connections[user];
				}
			}
            delete localStorage['auto_complete'];
            var r = /^(mysql|oracle|sqlite):\/\/(.*)$/;
            var type = '';
            if (user.match(r))
            {
                type = '?type=' + user.replace(r, '$1');
                user = user.replace(r, '$2'); 
            }
            $.jrpc('rpc-client.php' + type, 'login-attempt', 'login', {'user' : user, password: pass}, function(json){
                if (json.error == null){
                    var s = json.result.server != null ? json.result.server : 'localhost'; 
                    PROMPT = json.result.user + "@" + s + '> ';
                    localStorage['prompt'] = PROMPT;
                    callback(json.result.token);
                }
                else {
                    callback(false, json.error.message);
                }
            }, function(json){
                callback(false, 'There was an error processing the request');
            });
        }, 
        onBeforelogout: function(term){
            AUTOC = null;
            delete localStorage['auto_complete'];
            if (client_settings.clear_on_logout){
                term.clear();
            }
        }, 
        bash_like_escape: true, 
        bash_like_history: true, 
        scrollbars_x: client_settings.scrollbar, 
        scrollbars_y: true, 
        max_matches: client_settings.max_matches
    });

    $('body').append('<div id="dialog"></div>');

    $('#dialog').dialog({
        closeOnEscape: true, 
        autoOpen: false, 
        width: Math.round($(window).width() * 0.95), 
        height: Math.round($(window).height() * 0.95), 
        resizable: false, 
        position: 'center', 
        modal: true
    })
})
