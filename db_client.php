<?php
abstract class DbClient{
    protected $conn;
    protected $server;
    protected $user;
    protected $pass;
    protected $db;
    protected $port;
    protected $error = null;
    protected $info;
    private $def_import = true;

    abstract protected function get_defaults();

    abstract protected function autocomplete_tables_sql($db);

    abstract protected function autocomplete_columns_sql($db, $table); 

    abstract protected function driver_connect($user, $password); 

    abstract protected function autocomplete($db); 

    abstract protected function getQueryInfo();

    abstract protected function fetch_table_header($query);

    abstract protected function fetch_table_rows($query); 

    protected function do_import($file)
    {
        $this->def_import = false;
    } 

    private function check_ip_host(){
        if (file_exists(getcwd() . '/config.php')){
            require_once(getcwd() . '/config.php');
            if (isset($allowed_ips)){
                return array_search($_SERVER['REMOTE_ADDR'], $allowed_ips) !== false;
            }
            if (isset($allowed_hosts)){
                return array_search(gethostbyaddr($_SERVER['REMOTE_ADDR']), $allowed_hosts) !== false;
            }
        }
        return true;
    }

    private function set_defaults()
    {
        $defaults = $this->get_defaults();
        $this->server = $defaults['server'];
        $this->port = $defaults['port'];
        $this->db = null;
    }

    public function __construct(){
        if (!$this->check_ip_host()){
            $this->error = '(90001) ' . 'You are not authorized to access this resource';
        }
        $this->set_defaults();
        if (array_key_exists('u', $_SESSION)){
            $this->user = $_SESSION['u'];
        }
        if (array_key_exists('p', $_SESSION)){
            $this->pass = $_SESSION['p'];
        }
        if (array_key_exists('s', $_SESSION)){
            $this->server = $_SESSION['s'];
        }
        if (array_key_exists('db', $_SESSION)){
            $this->db = $_SESSION['db'];
        }
        if (array_key_exists('port', $_SESSION)){
            $this->port = $_SESSION['port'];
        }
    }

    protected function try_connect($user, $password){
        $this->driver_connect($user, $password); 
    }

    protected function extract_login_data($user, $password){
        $result = parse_url($user);
        if (!array_key_exists('user', $result))
        {
          $result['user'] = $result['host'];
          unset($result['host']);
        }
        return $result;
        // $pattern = '/^([^@]+)@([^:]+)[:]{0,1}([\d]*)/';
        // $result = $this->get_defaults();
        // $result['user'] = $user;
        // if (preg_match($pattern, $user)){
        //     $result['server'] = preg_replace($pattern, '\2', $user);
        //     $result['port'] = preg_replace($pattern, '\3', $user);
        //     $result['user'] = preg_replace($pattern, '\1', $user);
        // }

        // return $result;
    }

    public function login($user, $password){
        unset($_SESSION['u']); unset($_SESSION['p']); unset($_SESSION['db']); unset($_SESSION['s']);unset($_SESSION['port']);
        $this->set_defaults();

        $login_data = $this->extract_login_data($_SESSION['type'] . '://' . $user, $password);

        $_SESSION['s'] = $login_data['host']; 
        $_SESSION['port'] = $login_data['port']; 
        if (array_key_exists('query', $login_data))
        {
          $_SESSION['q'] = $login_data['query'];
        }
        $this->user = $login_data['user'];
        $this->server = $login_data['host']; 
        $this->port = $login_data['port']; 

        $this->try_connect($this->user, $password);

        $_SESSION['u'] = $this->user;
        $_SESSION['p'] = $password;

        return array('token' => md5($user . ':' . $password), 'server' => $_SESSION['s'], 'user' => $_SESSION['u']);
    }

    protected function getTable($query){
        $header = $this->fetch_table_header($query); 

        for ($i = 0; $i < count($header); $i++)
        {
            $header[$i]['length'] = mb_strlen($header[$i]['name']) + 2;
        }

        $rows = $this->fetch_table_rows($query); 

        foreach ($rows as $i => $row)
        {
            foreach ($row as $key => $value){
                $encoding = mb_detect_encoding($value, 'auto');
                //convert to unicode
                if ($encoding != 'UTF-8') {
                    if ($encoding === false){
                        $value = iconv('ISO-8859-1', 'UTF-8//IGNORE', $value);
                    }
                    else {
                        $value = iconv($encoding, 'UTF-8//TRANSLIT', $value);
                    }
                    $rows[$i][$key] = $value;
                }
                if ($value == null){
                    $rows[$i][$key] = '<NULL>';
                    $value = '<NULL>';
                }

                if (mb_strlen($value) + 2 > $header[$key]['length']){
                    $header[$key]['length'] = mb_strlen($value) + 2;
                }
            }
        }

        $this->info['affected_rows'] = count($rows); 

        return array('header' => $header, 'rows' => $rows);
    }

    public function query($command){
        $pattern = '/^[\s]*use[\s]+[`]{0,1}([a-zA-Z0-9_\-]+)[`]{0,1}[\s]*$/';
        if (preg_match($pattern, $command)){
            $db = preg_replace($pattern, '\1', $command);
            $this->try_connect($this->user, $this->pass); 
            $_SESSION['db'] = $db;
            return $this->autocomplete($db);
        }

        $this->try_connect($this->user, $this->pass); 

        $pattern = '/^[\s]*autocomplete[\s]+(append[\s]+){0,1}(`){0,1}([^\s]+){0,1}(`){0,1}[\s]*$/'; 
        if (preg_match($pattern, $command))
        {
            $_db = preg_replace($pattern, '\3', $command);
            return $this->autocomplete($_db); 
        }

        $pattern = '/^[\s]*import[\s]+[\'"]{0,1}([^\'"]+)[\'"]{0,1}[\s]*$/';
        if (preg_match($pattern, $command)){
            $file = preg_replace($pattern, '\1', $command);

            if (!file_exists($file)){
                throw new Exception('(10009) ' . $file . ' does not exists on the server. First you have to upload the file on the server');
            }

            $result = $this->do_import($file); 
            if (!$this->def_import)
            {
                throw new Exception('(10010) The import functionality is not defined for the ' . $_SESSION['type'] . ' engine'); 
            }
            return $result;
        }
        $pattern = '/^[\s]*export[\s]+(\'[^\']+\'|"[^"]+")[\s]+((no[\s]+routines[\s]+)|(no[\s]+data[\s]+)|(with[\s]+mysqldump[\s]+in[\s]+("[^"]+"|\'[^\']+\')[\s]+)){0,3}into[\s]+("[^"]+"|\'[^\']+\')[\s]*$/i';
        if (preg_match($pattern, $command)){
            preg_match_all($pattern, $command, $matches);
            if (count($matches) == 8){
                $pattern = '/^.(.*).$/';
                $dump_tables = preg_replace($pattern, '\1', $matches[1][0]);
                $dump_routines = true;
                $dump_data = true;
                $bin_path = '';
                if (preg_match('/^no[\s]+routines[\s]*$/', $matches[3][0])){
                    $dump_routines = false;
                }
                if (preg_match('/^no[\s]+data[\s]*$/', $matches[4][0])){
                    $dump_data = false;
                }
                if ($matches[6][0] != ''){
                    $bin_path = preg_replace($pattern, '\1', $matches[6][0]);
                }
                $output_path = preg_replace($pattern, '\1', $matches[7][0]);
                return $this->export_db($output_path, $dump_tables, $dump_routines, $dump_data, $bin_path);
            }
        }

        $start = microtime(true);
        $query = $this->do_driver_query($command); 
        $end = microtime(true);
        $this->time = $end - $start;
        $this->info = $this->getQueryInfo();
        $result = array('info' => array(), 'table' => array());
        if (is_object($query) || is_resource($query)){
            $result['table'] = $this->getTable($query);
        }
        $result['info'] = $this->info;
        return $result;
    }
}
?>
