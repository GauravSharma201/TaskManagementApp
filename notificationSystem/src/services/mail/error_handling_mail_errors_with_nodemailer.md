## Daily sending limits:

```
Gmail enforces strict limits on the number of recipients you can email within a 24-hour period:

Personal Gmail accounts: Up to 500 recipients per rolling 24-hour period
Google Workspace accounts: Up to 2,000 recipients per rolling 24-hour period
Each recipient counts individually, regardless of how many messages you send. For example, a single email with one To: address and one Cc: address counts as 2 recipients toward your limit.

If you exceed these limits, Gmail returns SMTP error 454 4.7.0 ("Too many recipients"). You must wait for the quota to reset before sending more emails.
```

## example error object:

```js
{
  message: 'Invalid login: 535 5.7.8 Authentication failed',
  code: 'EAUTH',
  command: 'AUTH PLAIN',
  response: '535 5.7.8 Authentication failed',
  responseCode: 535
}
```

## Error reference

This page documents all error codes and error types that Nodemailer and related packages can produce. Understanding these errors will help you diagnose issues and implement proper error handling in your application.

## Error object structure

When Nodemailer encounters an error, it creates an Error object with additional properties that provide context about what went wrong.

## Property Type Description

message string A human-readable description of the error.
code string An error code that identifies the type of error (such as ECONNECTION or EAUTH).
command string The SMTP command that was being executed when the error occurred (such as CONN, AUTH LOGIN).
response string The raw response string from the SMTP server, if available.
responseCode number The numeric SMTP response code from the server (such as 535 for authentication failure).
Example error object:

```js
{
message: 'Invalid login: 535 5.7.8 Authentication failed',
code: 'EAUTH',
command: 'AUTH PLAIN',
response: '535 5.7.8 Authentication failed',
responseCode: 535
}
```

## Error codes

Nodemailer uses specific error codes to categorize different types of failures. These codes are set on the error.code property.

## Connection errors

### ECONNECTION

A general connection error occurred. This typically happens when:

The connection to the SMTP server failed to establish
The connection was closed unexpectedly during a transaction
The server terminated the connection (response code 421)
The socket encountered an error
Common causes:

Incorrect hostname or port configuration
Firewall blocking the connection
Server is down or unreachable
Network connectivity issues
Troubleshooting:

Verify the host and port settings in your transport configuration
Check if your network allows outbound connections on the specified port
Try using telnet hostname port to test basic connectivity
Ensure the SMTP server is running and accepting connections

### ETIMEDOUT

The operation timed out. This can occur in several scenarios:

Connection timeout: Failed to establish TCP connection within the allowed time
Greeting timeout: Server did not send initial greeting after connection was established
Socket timeout: No activity on the connection for too long
Default timeout values:

Connection timeout: 2 minutes (120000 ms)
Greeting timeout: 30 seconds (30000 ms)
Socket timeout: 10 minutes (600000 ms)
Troubleshooting:

Increase timeout values in your transport configuration if network is slow
Check for network latency issues between your server and the SMTP server
Verify that the SMTP server is responsive

```js
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  connectionTimeout: 60000, // 1 minute
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 300000 // 5 minutes
});
```

### EDNS

DNS resolution failed. The hostname could not be resolved to an IP address.

Common causes:

Incorrect hostname (typo in the domain name)
DNS server is unreachable
The domain does not exist
Troubleshooting:

Verify the hostname is correct
Test DNS resolution: nslookup smtp.example.com
Check your DNS server configuration

### ESOCKET

A low-level socket error occurred. This is typically an error passed through from Node.js net or tls modules.

Common causes:

Network interruption during communication
Connection reset by peer (ECONNRESET)
Broken pipe (EPIPE)
TLS/SSL errors

### ETLS

A TLS-related error occurred. This can happen during:

Initial TLS connection (when using secure: true with port 465)
STARTTLS upgrade (when upgrading from unencrypted to encrypted connection)
TLS certificate validation
Common causes:

Invalid or self-signed TLS certificate
Certificate hostname mismatch
TLS version incompatibility
STARTTLS command failed
Troubleshooting:

For self-signed certificates in development, use tls: { rejectUnauthorized: false }
Ensure the server certificate is valid and not expired
Set tls.servername if connecting via IP address
Check if the server supports your TLS version

```js
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  tls: {
    // Do not fail on invalid certs (use only in development!)
    rejectUnauthorized: false,
    // Specify server name for SNI
    servername: 'smtp.example.com'
  }
});
```

## Authentication errors

### EAUTH

Authentication failed. The server rejected the provided credentials or authentication method.

Common causes:

Incorrect username or password
Account is locked or disabled
Authentication method not supported by server
OAuth2 token expired or invalid
Two-factor authentication enabled without app-specific password
The command property indicates which authentication step failed:

AUTH LOGIN - LOGIN authentication method
AUTH PLAIN - PLAIN authentication method
AUTH CRAM-MD5 - CRAM-MD5 authentication method
AUTH XOAUTH2 - OAuth2 authentication
Troubleshooting:

Verify your username and password are correct
For Gmail, use an App Password if 2FA is enabled
For OAuth2, ensure your access token is valid and not expired
Check if the server supports your chosen authentication method

```js
// Using App Password for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your.email@gmail.com',
    pass: 'your-16-char-app-password' // Not your regular password!
  }
});
```

### NoAuth

Authentication credentials were not provided when the server requires authentication.

Troubleshooting:

Add the auth object to your transport configuration
Ensure both user and pass properties are set
Envelope errors

### EENVELOPE

The message envelope is invalid. This relates to the MAIL FROM and RCPT TO commands.

Common causes:

No recipients defined (empty to, cc, and bcc)
Invalid sender address format
Invalid recipient address format
All recipients were rejected by the server
Server rejected the sender address
Internationalized email addresses when server does not support SMTPUTF8
Error scenarios:

No recipients defined - No valid recipients in the envelope
Invalid sender - The from address contains invalid characters
Invalid recipient - A recipient address contains invalid characters
Can't send mail - all recipients were rejected - Server rejected every recipient
Mail command failed - Server rejected the sender address
Recipient command failed - Server rejected a recipient address
Data command failed - Server rejected the DATA command
Internationalized mailbox name not allowed - Unicode address used without SMTPUTF8 support
Troubleshooting:

Ensure at least one recipient is specified
Verify email addresses do not contain special characters like <, >, or newlines
Check server logs for why addresses were rejected
For rejected recipients, check the rejected and rejectedErrors arrays in the error

```js
try {
  await transporter.sendMail(message);
} catch (err) {
  if (err.code === 'EENVELOPE') {
    console.log('Rejected recipients:', err.rejected);
    console.log('Rejection details:', err.rejectedErrors);
  }
}
```

## Message errors

### EMESSAGE

The message content is invalid or was rejected by the server.

Common causes:

Empty message body
Message size exceeds server limit
Server rejected the message after DATA command
Message content violated server policies
Troubleshooting:

Ensure message has content (text or html body)
Check if message size exceeds the server's SIZE limit
Review message content for policy violations (spam filters, etc.)
Stream errors

### ESTREAM

An error occurred while reading the message stream. This typically happens when using streams for message content or attachments.

Common causes:

Source stream emitted an error
File not found when using file path for attachment
Network error when fetching URL content
Troubleshooting:

Verify file paths exist and are readable
Handle stream errors before passing to Nodemailer
Check network connectivity for URL-based content
Protocol errors

### EPROTOCOL

The server response did not follow the expected SMTP protocol format.

Common causes:

Invalid greeting response (not starting with 220)
Invalid EHLO/HELO response
Unexpected response to a command
Server is not actually an SMTP server
Troubleshooting:

Verify you are connecting to an SMTP server (not HTTP, IMAP, etc.)
Check the port number is correct for SMTP
Review server logs for protocol issues
Pool-specific errors

### EMAXLIMIT

The connection pool has reached its maximum number of connections or send retries.

Common causes:

All pooled connections are busy
Maximum retry limit reached after connection failures
Connection pool is exhausted
Troubleshooting:

Increase maxConnections in pool configuration
Reduce message sending rate
Check for connection leaks (connections not being released)
Transport-specific errors
LegacyConfig
The transport configuration uses a legacy format that is no longer supported.

Troubleshooting:

Update your configuration to use the current API format
Review the Nodemailer documentation for current options
SMTP response codes
When communicating with SMTP servers, you may receive numeric response codes. The responseCode property on errors contains this value.

## Success codes (2xx)

Code Meaning
220 Service ready
221 Service closing transmission channel
235 Authentication successful
250 Requested mail action completed
251 User not local; will forward
252 Cannot VRFY user, but will accept message
354 Start mail input

## Temporary failure codes (4xx)

These indicate temporary failures. The operation may succeed if retried later.

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 421  | Service not available, closing transmission channel  |
| 450  | Requested mail action not taken: mailbox unavailable |
| 451  | Requested action aborted: local error in processing  |
| 452  | Requested action not taken: insufficient storage     |
| 454  | Temporary authentication failure                     |

## Permanent failure codes (5xx)

These indicate permanent failures. The operation will not succeed without changes.

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| 500  | Syntax error, command unrecognized                                     |
| 501  | Syntax error in parameters or arguments                                |
| 502  | Command not implemented                                                |
| 503  | Bad sequence of commands                                               |
| 504  | Command parameter not implemented                                      |
| 530  | Authentication required                                                |
| 535  | Authentication credentials invalid                                     |
| 538  | Encryption required for requested authentication mechanism             |
| 550  | Requested action not taken: mailbox unavailable (not found, no access) |
| 551  | User not local; please try forwarding                                  |
| 552  | Requested mail action aborted: exceeded storage allocation             |
| 553  | Requested action not taken: mailbox name not allowed (invalid syntax)  |
| 554  | Transaction failed (or no SMTP service here)                           |
| 555  | MAIL FROM/RCPT TO parameters not recognized                            |

## Sendmail transport errors

When using the sendmail transport, errors are generated based on the sendmail process exit code:

## Exit Codes and Error Messages

| Exit Code | Error Message                                            |
| --------- | -------------------------------------------------------- |
| 127       | Sendmail command not found, process exited with code 127 |
| Other     | Sendmail exited with code X                              |

Additional sendmail errors:

Can not send mail. Invalid envelope addresses. - Address starts with - (security risk)
sendmail was not found - Sendmail binary could not be spawned

## OAuth2 errors

When using OAuth2 authentication, these errors may occur:

## Error Messages and Causes

| Error Message                                   | Cause                                              |
| ----------------------------------------------- | -------------------------------------------------- |
| Can't create new access token for user          | No refresh mechanism available and token expired   |
| Can't generate token. Check your auth options   | JWT signing failed (service account)               |
| Invalid authentication response                 | OAuth server returned invalid response             |
| No access token                                 | OAuth server response did not include access token |
| Options "privateKey" and "user" are required... | Missing required options for service account       |

OAuth error responses from the server follow RFC 6749 format:

error: error_description (error_uri)

## Error handling best practices

### Basic error handling

```js
try {
  const info = await transporter.sendMail(message);
  console.log('Message sent:', info.messageId);
} catch (err) {
  console.error('Send failed:', err.message);
  console.error('Error code:', err.code);

  if (err.responseCode) {
    console.error('SMTP response:', err.responseCode, err.response);
  }
}
```

### Handling specific error types

```js
try {
  await transporter.sendMail(message);
} catch (err) {
  switch (err.code) {
    case 'ECONNECTION':
    case 'ETIMEDOUT':
      console.error('Network error - will retry later');
      // Schedule retry
      break;

    case 'EAUTH':
      console.error('Authentication failed - check credentials');
      // Do not retry without fixing credentials
      break;

    case 'EENVELOPE':
      console.error('Invalid recipients:', err.rejected);
      // Remove invalid recipients and retry
      break;

    case 'EMESSAGE':
      console.error('Message rejected by server');
      // Check message content
      break;

    default:
      console.error('Unexpected error:', err);
  }
}
```

### Verifying configuration before sending

Use transporter.verify() to test your configuration:

```js
try {
  await transporter.verify();
  console.log('Server is ready to accept messages');
} catch (err) {
  console.error('Configuration error:', err.message);
}
```

### Handling partial failures

When some recipients are rejected but others accepted:

```js
const info = await transporter.sendMail(message);

if (info.rejected && info.rejected.length > 0) {
  console.log('Message sent, but some recipients were rejected:');
  console.log('Accepted:', info.accepted);
  console.log('Rejected:', info.rejected);

  if (info.rejectedErrors) {
    info.rejectedErrors.forEach((err) => {
      console.log(`  ${err.recipient}: ${err.message}`);
    });
  }
}
```
