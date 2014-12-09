<?php
define('DEFAULT_ENGINE', 'mysql'); 
session_start();
if (array_key_exists('type', $_GET)){
    $type = $_GET['type'];
}
else if (array_key_exists('type', $_SESSION))
{
    $type = $_SESSION['type']; 
}
else 
{
    $type = DEFAULT_ENGINE;
}

if ($type == '')
{
    $type = DEFAULT_ENGINE;
}

$_SESSION['type'] = $type;

error_reporting(0);
// error_reporting(E_ALL & ~E_NOTICE);

require('json-rpc.php');
require('db_client.php'); 

$class = $_SESSION['type']; 
require($class . '.php'); 

handle_json_rpc(new $class());
?>
