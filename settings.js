var defaults = {
	scrollbar: true, 
	results_format: 'txt', 
	max_field_length: 255, // The maximum number of characters to display per column (You can enable extra info to see all the field)
	page_size: 100, // The number of rows after which the header will be repeated (0 means that the header will only be visible once before the rows)
	pagination: true, // If true, you will see only a page at a time
	extra_info: true, 
	clear_on_logout: false, 
	max_matches: 30, 
	pre_run_plugins: ['check_command', 'drupal_transform'], 
	post_run_plugins: [], 
    // return_matched_rows: false
};

var client_settings = typeof(localStorage['settings']) != 'undefined' ? JSON.parse(localStorage['settings']) : defaults;

localStorage['settings'] = JSON.stringify(client_settings);
