import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const returnTo = searchParams.get('returnTo') || '/tools/compress'
    
    // Create a success page that will activate the one-time payment in the browser
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
              margin: 1rem;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              background: #10b981;
              border-radius: 50%;
              margin: 0 auto 1rem;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
            }
            .title {
              color: #1f2937;
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }
            .message {
              color: #6b7280;
              margin-bottom: 1.5rem;
              line-height: 1.5;
            }
            .redirect-message {
              color: #4b5563;
              font-size: 0.9rem;
              margin-bottom: 1rem;
            }
            .spinner {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid #e5e7eb;
              border-radius: 50%;
              border-top: 2px solid #3b82f6;
              animation: spin 1s linear infinite;
              margin-right: 8px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1 class="title">Payment Successful!</h1>
            <p class="message">
              Your watermark removal credit has been activated.
              You can now use any PDF tool once without watermarks.
            </p>
            <p class="redirect-message">
              <span class="spinner"></span>
              Redirecting you back to the tool...
            </p>
          </div>
          
          <script>
            // Activate one-time payment access in localStorage
            const oneTimeData = {
              oneTimePaid: true,
              timestamp: Date.now(),
              creditsRemaining: 1,
              purchaseId: 'purchase_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };
            
            localStorage.setItem('oneTimeWatermarkRemoval', JSON.stringify(oneTimeData));
            
            // Redirect after 3 seconds
            setTimeout(() => {
              window.location.href = '${returnTo}?success=watermark-removed';
            }, 3000);
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error("Error handling one-time payment success:", error)
    const { searchParams } = new URL(req.url)
    const returnTo = searchParams.get('returnTo') || '/tools/compress'
    return NextResponse.redirect(new URL(`${returnTo}?error=success-handler-failed`, req.url))
  }
}
