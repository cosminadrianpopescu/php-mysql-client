<?php
class sqlite extends DbClient{
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
        $this->conn = new SQLite3($user); 
        $sql = "pragma encoding = 'utf-8'"; 
        $this->conn->exec($sql); 
        $sql = "pragma count_changes = 1"; 
        $this->conn->exec($sql); 
    }

    protected function autocomplete_tables_sql($db)
    {
        return "select name from sqlite_master where type = 'table'";
    }

    protected function autocomplete_columns_sql($db, $table)
    {
        return "pragma table_info('{$table}')";
    }

    protected function fetch_table_header($query)
    {
        for ($i = 0; $i < $query->numColumns(); $i++)
        {
            $name = $query->columnName($i);
            $header[] = array('name' => $name, 'orgname' => $name, 'table' => '#TABLE#');
        }

        return $header;
    }

    protected function fetch_table_rows($query)
    {
        $rows = array();

        while ($row = $query->fetchArray(SQLITE3_NUM))
        {
            $rows[] = $row;
        }

        return $rows;
    }

    protected function do_driver_query($command)
    {
        $query = $this->conn->query($command); 
        if (!$query)
        {
            throw new Exception('(' . $this->conn->lastErrorCode() . ') ' . $this->conn->lastErrorMsg()); 
        }
        return $query;
    }

    protected function autocomplete($db)
    {
        $sql = $this->autocomplete_tables_sql($db);
        $query = $this->do_driver_query($sql);

        $tables = array();

        while ($row = $query->fetchArray(SQLITE3_NUM)){
            $table = array();
            $sql = $this->autocomplete_columns_sql($db, $row[0]);
            $query2 = $this->do_driver_query($sql);
            while ($row2 = $query2->fetchArray(SQLITE3_NUM)){
                $table[] = $row2[1];
            }

            $tables[] = array('name' => $row[0], 'columns' => $table);
        }

        return array('auto_complete' => $tables);
    }

    protected function getQueryInfo(){
        $info = array('affected_rows' => 0, 'text' => 'Query OK. ', 
            'time' => round($this->time, 2));
        return $info;

    }
}
?>
