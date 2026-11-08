<?php
/**
 * RCV Technologies — form endpoint (contact, appointment, newsletter, job application).
 * Receives JSON from the site, validates, rate-limits, emails the team and logs to a JSONL file.
 * Settings: copy config.sample.php to config.php and edit.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$cfg = file_exists(__DIR__ . '/config.php') ? include __DIR__ . '/config.php' : include __DIR__ . '/config.sample.php';

function out($ok, $msg, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok, $ok ? 'message' : 'error' => $msg], JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(false, 'Method not allowed', 405);
$raw = file_get_contents('php://input', false, null, 0, 20000);
$d = json_decode($raw, true);
if (!is_array($d)) { $d = $_POST; }
if (!$d) out(false, 'Empty request', 400);

// Same-origin check (browsers send Origin/Referer on fetch)
$host = $_SERVER['HTTP_HOST'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin && $host && stripos($origin, $host) === false) out(false, 'Bad origin', 403);

// Honeypot + timing
if (!empty($d['website'])) out(true, 'Thank you!');
if (isset($d['elapsed']) && (int)$d['elapsed'] < 2000) out(true, 'Thank you!');

// Rate limit: 5 per IP per 10 minutes
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rlFile = sys_get_temp_dir() . '/rcv_rl_' . md5($ip);
$hits = file_exists($rlFile) ? array_filter(array_map('intval', file($rlFile, FILE_IGNORE_NEW_LINES)), fn($t) => $t > time() - 600) : [];
if (count($hits) >= 5) out(false, 'Too many requests. Please try again in a few minutes.', 429);
$hits[] = time(); file_put_contents($rlFile, implode("\n", $hits));

$clean = fn($k, $max = 500) => mb_substr(trim(strip_tags((string)($d[$k] ?? ''))), 0, $max);
$type = preg_replace('/[^a-z_-]/', '', $clean('type', 30)) ?: 'contact';
$name = $clean('name', 80); $email = $clean('email', 120); $phone = $clean('phone', 30);
$service = $clean('service', 80); $company = $clean('company', 120); $position = $clean('position', 120);
$message = $clean('message', 3000); $page = $clean('page', 200); $resume = $clean('resume', 300);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(false, 'Please enter a valid email address.', 422);
if ($type !== 'newsletter') {
    if (mb_strlen($name) < 2 || !preg_match('/^[\p{L}\p{M}\' .-]+$/u', $name)) out(false, 'Please enter your name.', 422);
    if ($phone !== '' && !preg_match('/^[+\d][\d\s().-]{6,}$/', $phone)) out(false, 'Please enter a valid phone number.', 422);
    if (substr_count($message, 'http') > 3) out(true, 'Thank you!');
}

$labels = ['contact' => 'Contact form', 'appointment' => 'Appointment request', 'newsletter' => 'Newsletter subscription', 'job' => 'Job application'];
$subject = ($labels[$type] ?? 'Website form') . ' — ' . ($service ?: $position ?: $email);
$lines = ["Type: " . ($labels[$type] ?? $type), "Name: $name", "Email: $email", "Phone: $phone", "Company: $company", "Service: $service", "Position: $position", "Resume link: $resume", "Page: $page", "IP: $ip", "Time: " . date('c'), "", "Message:", $message];
$body = implode("\n", $lines);

// Log (JSONL)
$log = $cfg['log_file'] ?? (__DIR__ . '/submissions.jsonl');
@file_put_contents($log, json_encode(['t' => date('c'), 'type' => $type, 'name' => $name, 'email' => $email, 'phone' => $phone, 'service' => $service, 'company' => $company, 'position' => $position, 'resume' => $resume, 'message' => $message, 'page' => $page, 'ip' => $ip], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

// Email
$to = $cfg['notify_email'] ?? 'info@rcvtechnologies.com';
$from = $cfg['from_email'] ?? ('no-reply@' . preg_replace('/^www\./', '', $host ?: 'rcvtechnologies.com'));
$headers = "From: RCV Website <$from>\r\nReply-To: " . str_replace(["\r", "\n"], '', $email) . "\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
if (!$sent && empty($cfg['allow_without_mail'])) out(false, 'Mail could not be sent right now. Please call +91-1206568230.', 500);

$thanks = $type === 'newsletter' ? 'You are subscribed. Welcome aboard!' : 'Thank you! We have received your message and will reply within one business day.';
out(true, $thanks);
