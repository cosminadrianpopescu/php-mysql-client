var RES_TEXT_LEN = 3 + 2;
var PAGE_REST = false;
var RESULT_SET = null;
var INFO = null;

var resultsTimeoutId = null;

var IDX = 0;

function txtLine(){
	var result = client_settings.extra_info ? '+---+' : '+';
	for (var i in RESULT_SET.header){
		for (var j = 0; j < RESULT_SET.header[i].length; j++){
			result += '-';
		}
		result += '+';
	}
	return result;
}

function txtValues(row, idx){
	var result = '|';
	if (client_settings.extra_info){
		var info_txt = idx != -1 ? 'i' + idx : ' ';
		result = '| ' + info_txt + ' |';
	}
	var len;
	for (var i in RESULT_SET.header){
        var value = row[i];
        if (row[i] == null)
        {
            value = '<NULL>';
        }
		len = value.length;
		len = len > client_settings.max_field_length - RES_TEXT_LEN - 2 ? client_settings.max_field_length - RES_TEXT_LEN - 2 : len;
		text = ' ' + value.substr(0, len) + ' ';
		for (var j = len + 2; j < RESULT_SET.header[i].length; j++){
			text += ' ';
		}
		text += '|';
		result += text;
	}

	return result;
}

function displayTxtHeader(){
	var row = new Array();
	var txt = '';
	for (var i = 0; i < RESULT_SET.header.length; i++){
		row.push(RESULT_SET.header[i].name);
	}

	var pref = txtLine() + '\n';

	if (((client_settings.page_size && !client_settings.pagination) || PAGE_REST) && IDX > 0){
		pref = '';
	}

	return pref + txtValues(row, -1, false) + '\n' + txtLine();
}

function displayTxtRows(){
	var result = '';
	var start = IDX;
	var end = IDX + (client_settings.page_size > 0 ? client_settings.page_size : RESULT_SET.rows.length);

	for (var i = start; i < end && i < RESULT_SET.rows.length; i++){
		result += txtValues(RESULT_SET.rows[i], i) + '\n';
	}

	IDX = end;

	result += txtLine();

	return result;
}

function displayTxt(){
	TERM.disable();
	for (var i in RESULT_SET.header){
		if (RESULT_SET.header[i].length > client_settings.max_field_length - RES_TEXT_LEN){
			RESULT_SET.header[i].length = client_settings.max_field_length - RES_TEXT_LEN;
		}
	}

	var result = '';

	result = displayTxtHeader(RESULT_SET.header) + '\n';

	result += displayTxtRows();

	TERM.echo(escape_brackets(result));
	if (client_settings.extra_info){
		var html = $('.terminal-output').children().last().html();
		html = html.replace(/<br>\|&nbsp;i([\d]+)&nbsp;\|/g, '<br>|&nbsp;<a href="#" onclick="rowDialog($1); return false;">i</a>&nbsp;|');
		$('.terminal-output').children().last().html(html);
	}
	displayFooter();
  $('html,body').animate({scrollTop: $('.prompt').offset().top + 10, scrollLeft: $('.prompt').offset().left - 10}, 'fast'); 
}

function rowDialog(idx){
	var content = '<table class="table">';
	for (var i in RESULT_SET.header){
		content += '<tr>';
		content += '<td class="left-col' + (i == 0 ? ' no-border' : '') + '">' + RESULT_SET.header[i].name + '</td>';
		content += '<td class="right-col' + (i == 0 ? ' no-border' : '') + '"><pre>' + RESULT_SET.rows[idx][i].replace(/</g, '&lt;') + '</pre></td>';
		content += '</tr>';
	}
	content += '</table>';
	//content = '<div style="overflow: auto">' + content + '</div>';
	$('#dialog').html(content).dialog('open');
}

function exportHTML(){
	if (typeof (RESULT_SET.rows) != 'undefined'){
		var html = '<table border="1">';
		html += '<tr>'
		for (var i in RESULT_SET.header){
			html += '<td style="padding: 5px;">' + RESULT_SET.header[i].name + '</td>';
		}
		html += '</tr>';

		for (var i in RESULT_SET.rows){
			html += '<tr>';
			for (var j in RESULT_SET.rows[i]){
				html += '<td>' + RESULT_SET.rows[i][j] + '</td>';
			}
			html += '</tr>';
		}

		html += '</table>';

		var p = window.open('', 'resizable=1,scrollbars=1,menubar=1,toolbar=1,titlebar=1,hotkeys=1,status=1,dependent=0,location=1');
		p.document.write('<html><head><title>Exported Rows</title>');
		p.document.write(html);
		p.document.write('</body></html>');
		p.document.close();
	}
}

function exportTxt(){
	if (typeof(RESULT_SET.rows) != 'undefined'){
		var txt = '';
		for (var i in RESULT_SET.header){
			txt += RESULT_SET.header[i].name + '\t';
		}

		for (var i in RESULT_SET.rows){
			txt += '\n';
			for (var j in RESULT_SET.rows[i]){
				txt += RESULT_SET.rows[i][j].replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t') + '\t';
			}
		}

		var p = window.open('sd', 'name');
		p.document.write('<html><head><title>Exported Rows</title>');
		p.document.write("<pre>" + txt + "</pre>");
		p.document.write('</body></html>');
		p.document.close();
	}
}

function exportSQLTable(table){
    var col_idx = [];
    var fields = '';
    for (var i in RESULT_SET.header){
        if (RESULT_SET.header[i].table == table){
            fields += (fields == '' ? '' : ', ') + '`' + RESULT_SET.header[i].orgname + '`'; 
            col_idx.push(i);
        }
    }

    var base_sql = 'replace into `' + table + '`(' + fields + ')';
    var txt = base_sql;
    var values = '', _values;
    var collection = [];

    for (var i in RESULT_SET.rows){
        _values = '';
        for (var j in col_idx){
            _values += (_values == '' ? '' : ', ') + "'" + RESULT_SET.rows[i][col_idx[j]].replace(/'/g, '\\\'') + "'";
        }
        if (collection.indexOf(_values) == -1){
            collection.push(_values);
            values += (values == '' ? '' : ',\n') + '(' + _values + ')'; 
        }
        if (values.length > 5000){
            txt += ' values' + values + '; \n' + base_sql;
            values = '';
        }
    }

    if (values != ''){
        txt += ' values' + values;
    }

    return txt;

}

function getTablesFromResultSet(){
    var tables = [];
    if (typeof(RESULT_SET.header) != 'undefined'){
        for (var i in RESULT_SET.header){
            if (tables.indexOf(RESULT_SET.header[i].table) == -1){
                tables.push(RESULT_SET.header[i].table);
            }
        }
    }

    return tables;
}

function exportSQL(){
	if (typeof(RESULT_SET.rows) != 'undefined'){
        var txt = '';
        var tables = getTablesFromResultSet();
        for (var i in tables){
            txt += exportSQLTable(tables[i]) + ';\n';
        }

		var p = window.open('sd', 'name');
		p.document.write('<html><head><title>Exported Rows</title>');
		p.document.write("<pre>" + txt + "</pre>");
		p.document.write('</body></html>');
		p.document.close();
	}
}

function displayFooter(){
	if (IDX < RESULT_SET.rows.length && (!client_settings.pagination || PAGE_REST)){
		resultsTimeoutId = setTimeout('displayTxt()', 10);
	}
	else {
		PAGE_REST = false;
		resultsTimeoutId = null;
		if (IDX < RESULT_SET.rows.length){
			$('.terminal-output').append('<a href="#" onclick="getNextPage(); return false;">Next page</a>');
			$('.terminal-output').append('&nbsp;&nbsp;&nbsp;&nbsp;');
			$('.terminal-output').append('<a href="#" onclick="getRestPages(); return false;">Get all results</a>');
			$('.terminal-output').append('&nbsp;&nbsp;&nbsp;&nbsp;');
		}
		$('.terminal-output').append('<a href="#" onclick="exportHTML(); return false;">Export HTML</a>');
		$('.terminal-output').append('&nbsp;&nbsp;&nbsp;&nbsp;');
		$('.terminal-output').append('<a href="#" onclick="exportTxt(); return false;">Export TXT</a>');
		$('.terminal-output').append('&nbsp;&nbsp;&nbsp;&nbsp;');
		$('.terminal-output').append('<a href="#" onclick="exportSQL(); return false;">Export SQL</a>');
		displayInfo();
		TERM.enable();
	}
}

function displayInfo(){
	var msg = 'Execution time: ' + INFO.time + ' seconds. ' + (RESULT_SET.length == 0 ? 'Affected rows: ' : 'Total rows: ') + INFO.affected_rows + '. \n' + INFO.text;
    TERM.echo('[[;#0f0;]' + escape_brackets(msg) + ']');
  $('html,body').animate({scrollTop: $('.prompt').offset().top + 10, scrollLeft: $('.prompt').offset().left - 10}, 'fast'); 
}

function getNextPage(){
	removeAllLinks();
	if (client_settings.results_format == 'txt'){
		displayTxt();
	}
}

function getRestPages(){
	removeAllLinks();
	PAGE_REST = true;
	if (client_settings.results_format == 'txt'){
		TERM.echo(txtLine() + '\n');
		displayTxt();
	}
}

function removeAllLinks(){
	//$('.terminal-output').find('a').remove();
    $('.terminal-output').find('a').each(function(idx){
        //console.log($(this).text());
        $(this).replaceWith($(this).text());
    });
}

function displayResult(table, info){
	RESULT_SET = table;
	INFO = info;
	IDX = 0;
	removeAllLinks();
	if (table.rows.length > 0){
		if (client_settings.results_format == 'txt'){
			displayTxt()
		}
	}
	else {
		displayInfo();
	}
}
