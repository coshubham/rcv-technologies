<?php
// Copy to config.php and edit. config.php is blocked from the web by .htaccess.
return [
    'notify_email' => 'info@rcvtechnologies.com',   // where form submissions are sent
    'from_email' => 'no-reply@rcvtechnologies.com', // must be a mailbox on your hosting domain for deliverability
    'log_file' => __DIR__ . '/submissions.jsonl',   // every submission is also appended here (keep it outside public_html if you can)
    'allow_without_mail' => true,                   // true = still answer "ok" and keep the log when mail() is unavailable
];
