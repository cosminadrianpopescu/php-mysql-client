<!DOCTYPE HTML>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta charset="utf-8" />
        <title>MySQL Command Line Client</title>
        <script src="plugins.js"></script>
        <script src="drupal-plugin.js"></script>
        <script src="settings.js"></script>
        <meta name="author" content="Cosmin Popescu"/>
        <meta name="Description" content="MySQL command line client"/>
        <link rel="sitemap" type="application/xml" title="Sitemap" href=""/>
        <link rel="shortcut icon" href="term.png"/>
        <script src="terminal/js/jquery-1.7.1.min.js"></script>
        <script src="terminal/js/jquery.mousewheel-min.js"></script>
        <script src="terminal/js/jquery.terminal-src.js"></script>
        <script src="display-results.js"></script>
        <script src="auto-complete.js"></script>
        <script src="js/jquery-ui-1.10.0.custom.min.js"></script>
        <link href="terminal/css/jquery.terminal.css" rel="stylesheet"/>
        <link href="css/jquery-ui-1.10.0.custom.min.css" rel="stylesheet"/>
        <script src="connections.js"></script>
        <script src="terminal.js"></script>
        <style>
            .table {
                padding: 2px;
                white-space: normal;
            }
            .left-col{
                width: 30%;
                vertical-align: top;
                border-top: 1px solid white;
                padding: 5px;
            }
            .right-col{
                border-top: 1px solid white;
                border-left: 1px solid white;
                width: 70%;
                padding: 5px;
                vertical-align: top;
            }
            .left-col pre, .right-col pre{
                margin: 0;                
            }
            .no-border{
                border-top: 0;
            }
        </style>
    </head>
    <body>
        <div id="full-data"></div>
        <div id="terminal"></div>
    </body>
</html>
