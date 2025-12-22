import type { Hono } from "hono";
import { generateUpcomingMeetingsCarouselHTML } from "../utils/html/meetings-carousel.js";

/**
 * Setup UI routes for rendering HTML cards
 * @param app - Hono app instance
 */
export const setupUIRoutes = <T extends Record<string, any>>(app: Hono<T>) => {
  /**
   * Upcoming meetings carousel HTML route (GET)
   * 
   * This endpoint serves an HTML page that reads meeting data from the URL hash fragment.
   * Using URL hash (#data) instead of query parameters avoids URL length limits since:
   * - Hash fragments can be much longer than query strings
   * - Hash data is processed client-side only and not sent to the server
   * - No server-side URL length restrictions apply
   * 
   * Expected URL format: /upcoming-meetings.html#base64EncodedMeetingsData
   * 
   * The meetings data should be a base64-encoded JSON object with:
   * - meetings: Array of meeting objects from Microsoft Graph API
   */
  app.get("/upcoming-meetings.html", (c) => {
    // Return HTML that will parse meetings data from URL hash on client side
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upcoming Meetings</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .loading {
            text-align: center;
            color: white;
            font-size: 1.25rem;
        }
        .error {
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
        }
        .error h1 {
            color: #dc2626;
            margin-bottom: 16px;
        }
        .error p {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="loading">Loading meetings...</div>
    <script>
        (function() {
            try {
                // Get data from URL hash
                const hash = window.location.hash.substring(1);
                if (!hash) {
                    throw new Error('No meeting data provided');
                }
                
                // Decode base64 and parse JSON
                const jsonStr = atob(hash);
                const data = JSON.parse(jsonStr);
                
                // Validate required fields
                if (!data.meetings || !Array.isArray(data.meetings) || data.meetings.length === 0) {
                    throw new Error('No meetings found');
                }
                
                // Send data to server to render the HTML
                fetch('/upcoming-meetings.html', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.text())
                .then(html => {
                    document.open();
                    document.write(html);
                    document.close();
                })
                .catch(err => {
                    console.error('Failed to render meetings:', err);
                    showError('Failed to load meetings');
                });
                
            } catch (error) {
                console.error('Failed to parse meeting data:', error);
                showError(error.message || 'Invalid meeting data');
            }
            
            function showError(message) {
                document.body.innerHTML = \`
                    <div class="error">
                        <h1>⚠️ Error</h1>
                        <p>\${message}</p>
                    </div>
                \`;
            }
        })();
    </script>
</body>
</html>
        `;

    return c.html(html);
  });

  /**
   * Upcoming meetings carousel HTML route (POST)
   * Receives meeting data in request body and renders the HTML carousel
   */
  app.post("/upcoming-meetings.html", async (c) => {
    try {
      const data = await c.req.json();
      const meetings = data.meetings || [];

      // Validate we have at least some data
      if (meetings.length === 0) {
        return c.html(
          `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No Meetings</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .error {
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
        }
        .error h1 {
            color: #667eea;
            margin-bottom: 16px;
        }
        .error p {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="error">
        <h1>📅 No Upcoming Meetings</h1>
        <p>You don't have any upcoming meetings scheduled.</p>
    </div>
</body>
</html>
            `,
        );
      }

      const html = generateUpcomingMeetingsCarouselHTML(meetings);
      return c.html(html);
    } catch (error) {
      return c.html(
        `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .error {
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
        }
        .error h1 {
            color: #dc2626;
            margin-bottom: 16px;
        }
        .error p {
            color: #666;
        }
    </style>
</head>
<body>
    <div class="error">
        <h1>⚠️ Error</h1>
        <p>Failed to process meeting data</p>
    </div>
</body>
</html>
            `,
        500,
      );
    }
  });
};
