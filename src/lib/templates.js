// ABOUTME: HTML templates for CDN error responses (451, 410, 403)
// ABOUTME: Provides clean, professional error pages for legal blocks and takedowns

const errorTemplates = {
  451: (reason, country) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>451 Unavailable For Legal Reasons</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #f9fafb;
      color: #1f2937;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 48px;
      margin: 0 0 16px;
      color: #dc2626;
    }
    h2 {
      font-size: 24px;
      margin: 0 0 24px;
      font-weight: 500;
    }
    p {
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 32px;
    }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      background: #f3f4f6;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>451</h1>
    <h2>Unavailable For Legal Reasons</h2>
    <p>This content is not available in your region${country ? ` (<span class="code">${country}</span>)` : ''} due to legal restrictions.</p>
    <p><strong>Reason:</strong> ${reason || 'Legal compliance requirement'}</p>
    <div class="footer">
      <p>This restriction is based on your geographic location as determined by your IP address.</p>
      <p>If you believe this is an error, please contact support.</p>
    </div>
  </div>
</body>
</html>`,

  410: (reason) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>410 Gone</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #f9fafb;
      color: #1f2937;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 48px;
      margin: 0 0 16px;
      color: #7c3aed;
    }
    h2 {
      font-size: 24px;
      margin: 0 0 24px;
      font-weight: 500;
    }
    p {
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 32px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>410</h1>
    <h2>Content Removed</h2>
    <p>This content has been permanently removed and is no longer available.</p>
    <p><strong>Reason:</strong> ${reason || 'Content policy violation'}</p>
    <div class="footer">
      <p>This content has been removed in accordance with our content policies or legal requirements.</p>
    </div>
  </div>
</body>
</html>`,

  403: (reason) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>403 Forbidden</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #f9fafb;
      color: #1f2937;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 48px;
      margin: 0 0 16px;
      color: #ef4444;
    }
    h2 {
      font-size: 24px;
      margin: 0 0 24px;
      font-weight: 500;
    }
    p {
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 32px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>403</h1>
    <h2>Access Forbidden</h2>
    <p>You don't have permission to access this content.</p>
    <p><strong>Reason:</strong> ${reason || 'Access restricted'}</p>
    <div class="footer">
      <p>This content is restricted based on our content policies.</p>
    </div>
  </div>
</body>
</html>`
};

export { errorTemplates };