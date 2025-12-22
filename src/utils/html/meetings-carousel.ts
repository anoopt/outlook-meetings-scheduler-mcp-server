/**
 * HTML escape function to prevent XSS attacks
 */
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Format ISO date string to human-readable format
 * @param isoDate - ISO date string
 * @returns Formatted date string like "Mon, Dec 23, 2024 at 2:30 PM"
 */
export const formatMeetingDate = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  } catch {
    return isoDate;
  }
};

/**
 * Format duration between two ISO date strings
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @returns Duration string like "1h 30m"
 */
export const formatDuration = (startDate: string, endDate: string): string => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (minutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  } catch {
    return 'N/A';
  }
};

/**
 * Generate HTML for upcoming meetings carousel using Fluent UI
 * @param meetings - Array of meeting objects
 * @returns Complete HTML page with carousel
 */
export const generateUpcomingMeetingsCarouselHTML = (meetings: any[]): string => {
  // Generate carousel items
  const carouselItems = meetings.map((meeting, index) => {
    const subject = escapeHtml(meeting.subject || 'No Subject');
    const startTime = meeting.start?.dateTime || '';
    const endTime = meeting.end?.dateTime || '';
    const location = escapeHtml(meeting.location?.displayName || 'No location');
    const organizer = escapeHtml(meeting.organizer?.emailAddress?.name || 'Unknown');
    const attendeeCount = meeting.attendees?.length || 0;
    const webLink = meeting.webLink || '#';
    
    const formattedDate = formatMeetingDate(startTime);
    const duration = formatDuration(startTime, endTime);
    
    return `
      <div class="carousel-item" data-index="${index}">
        <div class="meeting-card">
          <div class="meeting-header">
            <h2 class="meeting-title">${subject}</h2>
            <span class="meeting-badge">${duration}</span>
          </div>
          <div class="meeting-info">
            <div class="info-row">
              <span class="icon">📅</span>
              <span class="info-text">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="icon">📍</span>
              <span class="info-text">${location}</span>
            </div>
            <div class="info-row">
              <span class="icon">👤</span>
              <span class="info-text">Organizer: ${organizer}</span>
            </div>
            <div class="info-row">
              <span class="icon">👥</span>
              <span class="info-text">${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          ${webLink !== '#' ? `
          <div class="meeting-actions">
            <a href="${escapeHtml(webLink)}" target="_blank" class="join-button">
              Join Meeting
            </a>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Generate navigation dots
  const navigationDots = meetings.map((_, index) => {
    return `<button class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upcoming Meetings</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 800px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      color: white;
    }

    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .header p {
      font-size: 1rem;
      opacity: 0.9;
    }

    .carousel-container {
      position: relative;
      overflow: hidden;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .carousel-wrapper {
      display: flex;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .carousel-item {
      min-width: 100%;
      padding: 40px;
    }

    .meeting-card {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .meeting-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    .meeting-title {
      font-size: 1.75rem;
      color: #1a1a1a;
      font-weight: 600;
      flex: 1;
      line-height: 1.3;
    }

    .meeting-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .meeting-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1rem;
      color: #4a4a4a;
    }

    .icon {
      font-size: 1.25rem;
      width: 28px;
      text-align: center;
    }

    .info-text {
      flex: 1;
    }

    .meeting-actions {
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
    }

    .join-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .join-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    .carousel-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 30px 40px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .carousel-button {
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1.25rem;
      font-weight: bold;
    }

    .carousel-button:hover:not(:disabled) {
      background: #667eea;
      color: white;
      transform: scale(1.1);
    }

    .carousel-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .carousel-dots {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .carousel-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: none;
      background: #d1d5db;
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 0;
    }

    .carousel-dot.active {
      background: #667eea;
      width: 12px;
      height: 12px;
    }

    .carousel-dot:hover {
      background: #9ca3af;
    }

    .carousel-counter {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
      min-width: 60px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .carousel-item {
        padding: 24px;
      }

      .meeting-title {
        font-size: 1.375rem;
      }

      .carousel-controls {
        padding: 20px 24px;
      }

      .header h1 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Your Upcoming Meetings</h1>
      <p>Next ${escapeHtml(String(meetings.length))} meeting${meetings.length !== 1 ? 's' : ''} in your calendar</p>
    </div>
    
    <div class="carousel-container">
      <div class="carousel-wrapper" id="carouselWrapper">
        ${carouselItems}
      </div>
      
      <div class="carousel-controls">
        <button class="carousel-button" id="prevButton" aria-label="Previous meeting">‹</button>
        <span class="carousel-counter" id="carouselCounter">1 / ${meetings.length}</span>
        <div class="carousel-dots" id="carouselDots">
          ${navigationDots}
        </div>
        <button class="carousel-button" id="nextButton" aria-label="Next meeting">›</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const wrapper = document.getElementById('carouselWrapper');
      const prevButton = document.getElementById('prevButton');
      const nextButton = document.getElementById('nextButton');
      const counter = document.getElementById('carouselCounter');
      const dots = document.querySelectorAll('.carousel-dot');
      const totalSlides = ${meetings.length};
      let currentIndex = 0;

      function updateCarousel() {
        wrapper.style.transform = \`translateX(-\${currentIndex * 100}%)\`;
        counter.textContent = \`\${currentIndex + 1} / \${totalSlides}\`;
        
        // Update dots
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === currentIndex);
        });

        // Update button states
        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === totalSlides - 1;
      }

      prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        }
      });

      nextButton.addEventListener('click', () => {
        if (currentIndex < totalSlides - 1) {
          currentIndex++;
          updateCarousel();
        }
      });

      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          currentIndex = parseInt(e.target.dataset.index);
          updateCarousel();
        });
      });

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        } else if (e.key === 'ArrowRight' && currentIndex < totalSlides - 1) {
          currentIndex++;
          updateCarousel();
        }
      });

      // Initialize
      updateCarousel();
    })();
  </script>
</body>
</html>
  `.trim();
};
