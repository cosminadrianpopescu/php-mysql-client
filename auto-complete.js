var AUTOC = typeof(localStorage['auto_complete']) == 'undefined' ? null : JSON.parse(localStorage['auto_complete']);

var command_types = ['select', 'update', 'insert', 'replace', 'delete', 'drop', 'desc', 'truncate', 'describe'];
var settings_list = ['scrollbar', 'results_format', 'max_field_length', 'page_size', 'pagination', 'extra_info', 'reset', 'clear_on_logout', 'max_matches', 'return_matched_rows'];
var reserver_words = command_types.concat(['show', 'tables', 'explain', 'create', 'table']);

function command_type(command){
	var r;
	for (var i in command_types){
		r = new RegExp("[ \t\n\r]*" + command_types[i] + '\\b', 'i');
		if (command.match(r)){
			return i;
		}
	}

	return -1;
}

function replaceStrings(command){
    var r = [/"([^"\\]*(?:\\.[^"\\]*)*)"/, /'([^'\\]*(?:\\.[^'\\]*)*)'/];

    for (j = 0; j < 2; j++){
	    matches = r[j].exec(command);
	    var s;
	    while (matches != null){
	    	s = '';
	    	for (var i = 0; i < matches[0].length; i++){
	    		s += '_';
	    	}
	    	command = command.replace(r[j], s);
	    	matches = r[j].exec(command);
	    }
    }

    return command;
}

function auto_complete_tables(word){
	var result = []
	for (var i in AUTOC){
		if (AUTOC[i].name.indexOf(word) == 0){
			result.push(AUTOC[i].name);
		}
	}

	return result;
}

function auto_complete_array(word, arr){
	var result = []
	for (var i in arr){
		if (arr[i].indexOf(word) == 0){
			result.push(arr[i]);
		}
	}

	return result;
}

function auto_complete_fields(word, tables){
	var result = [];

	for (var i in tables){
		for (var j in AUTOC){
			if (tables[i] == AUTOC[j].name){
				for (k = 0; k < AUTOC[j].columns.length; k++){
					if (AUTOC[j].columns[k].indexOf(word) == 0){
						result.push(AUTOC[j].columns[k]);
					}
				}
			}
		}
	}

	return result;
}

function try_auto_complete_settings(word, command){
	if (!command.match(/^[\s]*[a-zA-Z0-9_\.]+[\s]*$/)){
		return [];
	}
	var r = /^[\s]*(settings|setting|settin|setti|sett|set|se|s)([\.]{0,1})([a-zA-Z0-9_]*)$/
    if (word.match(r)){
    	var s = word.replace(r, '$1');
    	var p = word.replace(r, '$2');
    	var w = word.replace(r, '$3');

    	if (s != 'settings' && p == '' && w == ''){
    		return [s, 'settings'];
    	}
    	if (s == 'settings' && p == '.'){
    		return [w].concat(auto_complete_array(w, settings_list));
    	}
    }
	return [];
}

function try_auto_complete(word, command, what){
	var r2 = /^([A-Za-z0-9_]+)\.([A-Za-z0-9_]*)$/;

	if (word.match(r2)){
		var table = word.replace(r2, '$1');
		var field = word.replace(r2, '$2');
		return auto_complete_fields(field, [table]);
	}

	if (what == 'tables'){
		return auto_complete_tables(word);
	}

	if (what == 'fields'){
		var words = extract_words(command);
		return auto_complete_fields(word, words).concat(word.length > 0 ? auto_complete_tables(word) : []);
	}

	return [];
}

function extract_words(command){
	var r = /\w([a-zA-Z0-9_]+)\w/;

    matches = r.exec(command);
    var result = [];
    while (matches != null){
    	if (!matches[0].match(/^[_]+$/)){
	    	result.push(matches[0]);
    	}
    	command = command.replace(r, '');
    	matches = r.exec(command);
    }

    return result;
}

function auto_complete_select(command, position, word){
    //var r1 = /"([^"\\]*(?:\\.[^"\\]*)*)"/;
    //var r2 = /'([^'\\]*(?:\\.[^'\\]*)*)'/;
    //var r3 = /`([^`\\]*(?:\\.[^`\\]*)*)`/gi;
    //command = command.replace(r1, '').replace(r2, '').replace(r3, '');
	//command = command.replace(/^[ \t\n\r]*select(.*)(from){0,1}(.*)(where){0,1}(.*)(group[ \t\n\r]+by){0,1}(.*)(having){0,1}(.*)(order[ \t\r\n]by){0,1}(.*)$/gi)

	var select = command.toLowerCase().indexOf('select');
	var from = command.toLowerCase().indexOf('from');
	var where = command.toLowerCase().indexOf('where');
	var group = command.toLowerCase().indexOf('group');
	var having = command.toLowerCase().indexOf('having');
	var order = command.toLowerCase().indexOf('order');

	if (order != -1 && position > order){
		return try_auto_complete(word, command, 'fields');
	}
	else if (having != -1 && position > having){
		return try_auto_complete(word, command, 'fields');
	}
	else if (group != -1 && position > group){
		return try_auto_complete(word, command, 'fields');
	}
	else if (where != -1 && position > where){
		return try_auto_complete(word, command, 'fields');
	}
	else if (from != -1 && position > from){
		return try_auto_complete(word, command, 'tables');
	}
	else if (select != -1 && position > select){
		return try_auto_complete(word, command, 'fields');
	}
	return [];
}

function auto_complete_update(command, position, word){
	var update = command.toLowerCase().indexOf('update');
	var set = command.toLowerCase().indexOf('set');
	var where = command.toLowerCase().indexOf('where');

	if (where != -1 && position > where){
		return try_auto_complete(word, command, 'fields');
	}
	else if (set != -1 && position > set){
		return try_auto_complete(word, command, 'fields');
	}
	else if (update != -1 && position > update){
		return try_auto_complete(word, command, 'tables');
	}
	return [];
}

function auto_complete_insert(command, position, word){
	return try_auto_complete(word, command, 'fields');
}

function auto_complete_drop(command, position, word){
	return try_auto_complete(word, command, 'tables');
}

function auto_complete_delete(command, position, word){
	var del = command.toLowerCase().indexOf('delete');
	var where = command.toLowerCase().indexOf('where');

	if (where != -1 && position > where){
		return try_auto_complete(word, command, 'fields');
	}
	else if (del != -1 && position > del){
		return try_auto_complete(word, command, 'tables');
	}
	return [];
}

function do_auto_complete(command, position){
    var word = command.slice(0, position).split("").reverse().join("");

    if (!word.match(/^([A-Za-z0-9_\.]*)/)){
    	return [];
    }

    word = word.replace(/^([A-Za-z0-9_\.]*).*$/, '$1');
    word = word.split("").reverse().join("");

    var ac = try_auto_complete_settings(word, command);
    if (ac.length > 0){
    	return ac;
    }

    command = replaceStrings(command);
	var type = command_type(command);
	var result = [];

	if (type == -1){
		return auto_complete_array(word, reserver_words);
	}

	if (command_types[type] == 'select'){
		result = auto_complete_select(command, position, word);
	}
	else if (command_types[type] == 'update'){
		result = auto_complete_update(command, position, word); 
	}
	else if (command_types[type] == 'insert' || command_types[type] == 'replace'){
		result = auto_complete_insert(command, position, word); 
	}
	else if (command_types[type] == 'delete'){
		result = auto_complete_delete(command, position, word); 
	}
	else if (command_types[type] == 'drop' || command_types[type] == 'desc' || command_types[type] == 'truncate' || command_types[type] == 'describe'){
		result = auto_complete_drop(command, position, word); 
	}

    // var p = position - command.length + text.length;

    // self.set(text);
    // self.position(p); 
    // redraw();

    var filtered = [];
	$.each(result, function(i, el){
		if($.inArray(el, filtered) === -1) filtered.push(el);
	});

	return [word.replace(/^[^\.]*\.(.*)$/, '$1')].concat(filtered);
}

