<?php
class oracle extends DbClient{
    protected $driver;

    private $rows = 0;

    protected function get_defaults()
    {
        return array(
            'server' => '192.168.100.124/orcl', 
            // 'server' => 'locahost/XE', 
            'port' => '1521', 
            // 'port' => 12345, 
        ); 
    }

    protected function driver_connect($user, $password)
    {
        $conn_data = '';
        if (array_key_exists('q', $_SESSION))
        {
            $conn_data = '(CONNECT_DATA=(' . $_SESSION['q'] . '))';
        }
        $conn_string = '(DESCRIPTION =(ADDRESS =(PROTOCOL = TCP)(HOST = ' . $this->server . ')(PORT = ' . $this->port . '))' . $conn_data . ')';
        $this->conn = oci_connect($user, $password, $conn_string); 
        if (!$this->conn)
        {
            $e = oci_error();
            throw new Exception('(' . $e['code'] . ') ' . $e['message']); 
        }
    }

    /**
     * Gets the sql to fetch the list of databases available for a certain user
     * @access private
     * @return string
     */
    private function databases_sql(){
        return "select lower(owner) from all_tables group by lower(owner)";
    }

    protected function autocomplete_tables_sql($db)
    {
        $_SESSION['_show_tables'] = $db;
        return "(select lower(table_name) as name from all_tables where lower(owner) = lower('" . $db . "')) union (select view_name as name from all_views where lower(owner) = lower('" . $db . "'))"; 
    }

    protected function autocomplete_columns_sql($db, $table)
    {
      return "select lower(COLUMN_NAME) as col, data_type, /*data_type_mod, data_type_owner, */data_length, /*data_precision, data_scale, */nullable, column_id, default_length, data_default, low_value, high_value from all_tab_cols where lower(owner) = lower('" . $db . "') " . 
            "and lower(TABLE_NAME) = lower('" . $table . "')";
    }

    protected function do_driver_query($command)
    {
        $pattern = '/[\s]*desc[\s]+([^\s]+)[\s]*/i';
        if (preg_match('/^[\s]*show[\s]+tables[\s]*/i', $command))
        {
          if (array_key_exists('_show_tables', $_SESSION))
          {
              $command = $this->autocomplete_tables_sql($_SESSION['_show_tables']);
          }
          else 
          {
              throw new Exception('(20001) You have first to autocomplete a database');
          }
        }
        else if (preg_match($pattern, $command))
        {
            if (array_key_exists('_show_tables', $_SESSION))
            {
                $table = preg_replace($pattern, '\1', $command);
                $command = $this->autocomplete_columns_sql($_SESSION['_show_tables'], $table);
            }
            else 
            {
                throw new Exception('(20001) You have first to autocomplete a database');
            }
        }
        else if (preg_match('/^[\s]*show[\s]+databases[\s]*$/i', $command))
        {
            $command = $this->databases_sql();
        }
        $stm = oci_parse($this->conn, $command); 
        if (!$stm)
        {
            $e = oci_error();
            throw new Exception('(' . $e['code'] . ') ' . $e['message']); 
        }

        $result = oci_execute($stm); 
        if (!$result)
        {
            $e = oci_error($stm); 
            throw new Exception('(' . $e['code'] . ') ' . $e['message']); 
        }
        return $stm;
    }

    protected function autocomplete($db)
    {
        if ($db == '')
        {
            $db = $this->user;
        }
        $sql = $this->autocomplete_tables_sql($db);
        $stm = oci_parse($this->conn, $sql); 
        oci_execute($stm); 

        $tables = array();

        while ($row = oci_fetch_assoc($stm))
        {
            $table = array();
            $sql = $this->autocomplete_columns_sql($db, $row["NAME"]);
            $stm2 = oci_parse($this->conn, $sql); 
            oci_execute($stm2); 
            while ($row2 = oci_fetch_assoc($stm2)){
                $table[] = $row2["COL"];
            }

            oci_free_statement($stm2); 

            $tables[] = array('name' => $row["NAME"], 'columns' => $table);
        }

        oci_free_statement($stm); 

        return array('auto_complete' => $tables);
    }

    protected function fetch_table_header($stm)
    {
        for ($i = 1; $i <= oci_num_fields($stm); $i++)
        {
            $name = oci_field_name($stm, $i); 
            $header[] = array('name' => $name, 'orgname' => $name, 'table' => '<TABLE>');
        }

        return $header;
    }

    protected function fetch_table_rows($stm)
    {
        $rows = array();
        while ($row = oci_fetch_row($stm))
        {
            $rows[] = $row;
        }

        return $rows;
    }

    protected function getQueryInfo(){
        $info = array('affected_rows' => $this->rows, 'text' => 'Query OK. ', 
            'time' => round($this->time, 2));
        return $info;

    }

}
?>
