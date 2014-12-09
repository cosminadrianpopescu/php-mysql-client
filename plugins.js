function check_command(command)
{ 
    if (command == false)
    {
        return false;
    }

	if (command.match(/^[\s]*settings\.reset[\s]*$/)){
		delete localStorage['settings'];
		client_settings = defaults;

		return false;
	}

	var r = /^[\s]*settings\.([a-z_]+)[\s]*=[\s]*(.*)$/g;
	if (command.match(r)){
		var key = command.replace(r, '$1');
		if (key == 'pre_run_plugins' || key == 'post_run_plugins'){
			return command;
		}
		var value = command.replace(r, '$2'); 
		eval('client_settings.' + key + ' = ' + value + ';');
		localStorage['settings'] = JSON.stringify(client_settings);

		return false;
	}

	if (command.match(/^[\s]*show[\s]+settings[\s]*$/)){
		var s = '{\n';
		s += '\tscrollbar*: ' + (client_settings.scrollbar ? 'ON' : 'OFF') + ', \n';
		s += '\tresults_format: ' + client_settings.results_format + ', \n';
		s += '\tmax_field_length: ' + client_settings.max_field_length + ', \n';
		s += '\tpage_size: ' + client_settings.page_size + ', \n';
		s += '\tpagination: ' + (client_settings.pagination ? 'ON' : 'OFF') + ', \n';
		s += '\textra_info: ' + (client_settings.extra_info ? 'ON' : 'OFF') + '\n';
		s += '\tclear_on_logout: ' + (client_settings.clear_on_logout ? 'ON' : 'OFF') + '\n';
		s += '\tmax_matches*: ' + client_settings.max_matches + ', \n';
		// s += '\treturn_matched_rows: ' + client_settings.return_matched_rows + ', \n';
		s += '}\n\n* Requires a page refresh';
		TERM.echo(s);
		return false;
	}

	return command;
}
