<?php
class mysql extends DbClient{
    protected $driver;

    protected function get_defaults()
    {
        return array(
            'server' => 'localhost', 
            'port' => '3306', 
        ); 
    }

    protected function driver_connect($user, $password)
    {
        $this->driver = new mysqli_driver();
        $this->driver->report_mode = MYSQLI_REPORT_STRICT;

        $this->conn = new mysqli($this->server, $user, $password, '', $this->port);
        $this->conn->set_charset('utf8');
        if ($this->db != null){
            $this->conn->select_db($_SESSION['db']);
        }
    }

    protected function export_db($output_path, $dump_tables = '*', $dump_routines = true, $dump_data = true, $mysqldump_path = ''){
        $start = microtime(true);
        $command = 'mysqldump';
        if ($mysqldump_path != ''){
            $command = preg_replace('/^(.*)\/$/', '\1', $mysqldump_path) . '/' . $command;
        }

        if ($dump_tables != '*'){
            $sql = "show tables";
            if ($query = $this->conn->query($sql)){
                $table = $this->getTable($query);
                foreach ($table['rows'] as $row){
                    if (!preg_match($dump_tables, $row[0])){
                        $command .= ' --ignore-table=' . $this->db . '.' . $row[0];
                    }
                }
            }
        }

        if ($dump_routines) {
            $command .= ' -R';
        }

        if (!$dump_data){
            $command .= ' -d';
        }

        $command .= ' -u' . $this->user . ' -P' . $this->port . ' -h' . $this->server . ' -p' . $this->pass . ' ' . $this->db . ' >' . $output_path;

            /*$f = popen($command, "r");
            $response = '';
            while (!feof($f)){
                $response .= fread($f, 4096);
            }
            fclose($f);*/

        exec($command, $a_output, $i_result);
        $response = implode("\n", $a_output);

        $end = microtime(true);
        $info = array('affected_rows' => '0', 'text' => 'mysqldump returned: (' . $i_result . ') ' . $response, 'time' => round($end - $start, 2));
        return array('info' => $info, 'table' => array()); 
    }

    protected function do_import($file){
        $start = microtime(true);
        $sql = file_get_contents($file);
        if ($this->conn->multi_query($sql)){
            $i = 0;
            while ($this->conn->more_results()){
                $this->conn->next_result();
                $i++;
            }
            $end = microtime(true);
            if ($this->conn->errno){
                throw new Exception('10010 ' . $file . ' returned ' . $this->conn->error . ' to the #' . $i . ' query.' . "\n" . 'The first ' . $i . ' queries were executed correctly.');
            }
            $info = array('affected_rows' => '0', 'text' => 'File imported correctly. ' . $i . ' queries executed. ', 'time' => round($end - $start, 2));
            $result = array('info' => $info, 'table' => array()); 
            return $result;
        }
        else {
            throw new Exception('(' . $this->conn->errno . ') ' . $this->conn->error);
        }
    }

    protected function autocomplete_tables_sql($db)
    {
        return "select TABLE_NAME from information_schema.TABLES where TABLE_SCHEMA = '" . $this->conn->real_escape_string($db) . "'";
    }

    protected function autocomplete_columns_sql($db, $table)
    {
        return "select COLUMN_NAME from information_schema.COLUMNS where TABLE_SCHEMA = '" . $this->conn->real_escape_string($db) . 
            "' and TABLE_NAME = '" . $this->conn->real_escape_string($table) . "'";
    }

    protected function do_driver_query($command)
    {
        if ($query = $this->conn->query($command)){
            return $query;
        }
        else 
        {
            throw new Exception('(' . $this->conn->errorno . ') ' . $this->conn->error);
        }
    }

    protected function autocomplete($db)
    {
        $sql = $this->autocomplete_tables_sql($db);
        $query = $this->conn->query($sql);

        $tables = array();

        while ($row = $query->fetch_row()){
            $table = array();
            $sql = $this->autocomplete_columns_sql($db, $row[0]);
            $query2 = $this->conn->query($sql);
            while ($row2 = $query2->fetch_row()){
                $table[] = $row2[0];
            }

            $tables[] = array('name' => $row[0], 'columns' => $table);
        }

        return array('auto_complete' => $tables);
    }

    protected function fetch_table_header($query)
    {
        $fields = $query->fetch_fields();

        foreach ($fields as $field){
            $header[] = array('name' => $field->name, 'orgname' => $field->orgname, 'table' => $field->orgtable);
        }

        return $header;
    }

    protected function fetch_table_rows($query)
    {
        $rows = array();
        while ($row = $query->fetch_row())
        {
            $rows[] = $row;
        }
        
        return $rows;
    }

    protected function getQueryInfo(){
        $info = array('affected_rows' => $this->conn->affected_rows, 'text' => 'Query OK. ', 
            'time' => round($this->time, 2));
        if ($this->conn->info != null){
            $info['text'] .= $this->conn->info;
        }
        return $info;

    }

}
?>
