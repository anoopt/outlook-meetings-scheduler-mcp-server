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
 * Format relative time (e.g., "2 hours ago", "in 30 minutes")
 * @param isoDate - ISO date string
 * @returns Relative time string
 */
export const formatRelativeTime = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins >= 0 && diffMins < 60) {
      return diffMins <= 1 ? 'Starting soon' : `In ${diffMins} minutes`;
    } else if (diffHours >= 1 && diffHours < 24) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays >= 1 && diffDays < 7) {
      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffMins < 0 && diffMins > -60) {
      return `${Math.abs(diffMins)} minutes ago`;
    } else if (diffHours < 0 && diffHours > -24) {
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
    }
    return formatMeetingDate(isoDate);
  } catch {
    return isoDate;
  }
};

/**
 * Get initials from a name for avatar display
 * @param name - Full name
 * @returns Initials (up to 2 characters)
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Generate a consistent color based on a string (for avatar backgrounds)
 * Uses Microsoft's color palette
 * @param str - Input string
 * @returns CSS color value
 */
export const getAvatarColor = (str: string): string => {
  const colors = [
    '#0078d4', // Microsoft Blue
    '#107c10', // Green
    '#5c2d91', // Purple
    '#b4009e', // Magenta
    '#d83b01', // Orange
    '#008272', // Teal
    '#004e8c', // Dark Blue
    '#7719aa', // Violet
    '#69797e', // Gray
    '#498205', // Lime
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Generate HTML for upcoming meetings using Microsoft Fabric Core design
 * Creates a document card list view matching Microsoft 365 styling
 * @param meetings - Array of meeting objects
 * @returns Complete HTML page with meeting cards
 */
export const generateUpcomingMeetingsListHTML = (meetings: any[]): string => {
  // Generate meeting cards
  const meetingCards = meetings.map((meeting) => {
    const subject = escapeHtml(meeting.subject || 'No Subject');
    const startTime = meeting.start?.dateTime || '';
    const endTime = meeting.end?.dateTime || '';
    const location = escapeHtml(meeting.location?.displayName || '');
    const organizer = escapeHtml(meeting.organizer?.emailAddress?.name || 'Unknown');
    const organizerEmail = escapeHtml(meeting.organizer?.emailAddress?.address || '');
    const attendeeCount = meeting.attendees?.length || 0;
    const webLink = meeting.webLink || '';
    const isOnline = meeting.isOnlineMeeting || false;
    const onlineProvider = meeting.onlineMeetingProvider || '';
    
    const formattedDate = formatMeetingDate(startTime);
    const duration = formatDuration(startTime, endTime);
    const relativeTime = formatRelativeTime(startTime);
    const initials = getInitials(organizer);
    const avatarColor = getAvatarColor(organizerEmail || organizer);

    // Determine meeting type icon and color
    let meetingTypeIcon = 'Calendar';
    let meetingTypeColor = '#0078d4';
    let meetingTypeLabel = 'Meeting';
    
    if (isOnline || onlineProvider) {
      if (onlineProvider?.toLowerCase().includes('teams')) {
        meetingTypeIcon = 'TeamsLogo';
        meetingTypeColor = '#6264a7';
        meetingTypeLabel = 'Teams Meeting';
      } else if (onlineProvider?.toLowerCase().includes('skype')) {
        meetingTypeIcon = 'SkypeLogo';
        meetingTypeColor = '#00aff0';
        meetingTypeLabel = 'Skype Meeting';
      } else {
        meetingTypeIcon = 'Video';
        meetingTypeColor = '#0078d4';
        meetingTypeLabel = 'Online Meeting';
      }
    }
    
    return `
      <div class="ms-DocumentCard">
        <div class="ms-DocumentCard-preview" style="background-color: ${meetingTypeColor}">
          <i class="ms-Icon ms-Icon--${meetingTypeIcon}" aria-hidden="true"></i>
          <span class="preview-label">${meetingTypeLabel}</span>
          <span class="duration-badge">${duration}</span>
        </div>
        <div class="ms-DocumentCard-details">
          <div class="ms-DocumentCard-title" title="${subject}">${subject}</div>
          <div class="ms-DocumentCard-activity">
            <div class="activity-icon">
              <i class="ms-Icon ms-Icon--DateTime" aria-hidden="true"></i>
            </div>
            <div class="activity-details">
              <span class="activity-name">${formattedDate}</span>
              <span class="activity-status">${relativeTime}</span>
            </div>
          </div>
          ${location ? `
          <div class="ms-DocumentCard-activity">
            <div class="activity-icon">
              <i class="ms-Icon ms-Icon--POI" aria-hidden="true"></i>
            </div>
            <div class="activity-details">
              <span class="activity-name">${location}</span>
            </div>
          </div>
          ` : ''}
          ${attendeeCount > 0 ? `
          <div class="ms-DocumentCard-activity">
            <div class="activity-icon">
              <i class="ms-Icon ms-Icon--People" aria-hidden="true"></i>
            </div>
            <div class="activity-details">
              <span class="activity-name">${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          ` : ''}
        </div>
        <div class="ms-DocumentCard-footer">
          <div class="organizer-info">
            <div class="ms-Persona">
              <div class="ms-Persona-imageArea" style="background-color: ${avatarColor}">
                <span class="ms-Persona-initials">${initials}</span>
              </div>
              <div class="ms-Persona-details">
                <span class="ms-Persona-primaryText">${organizer}</span>
                <span class="ms-Persona-secondaryText">Organizer</span>
              </div>
            </div>
          </div>
          ${webLink ? `
          <button type="button" class="ms-Button ms-Button--primary copy-link" title="Copy link to clipboard" data-url="${escapeHtml(webLink)}">
            <i class="ms-Icon ms-Icon--Link" aria-hidden="true"></i>
            <span>Copy Link</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upcoming Meetings - Microsoft Graph</title>
  <!-- Microsoft Fabric Core CSS -->
  <link rel="stylesheet" href="https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/office-ui-fabric-core/11.1.0/css/fabric.min.css">
  <style>
    :root {
      --themePrimary: #0078d4;
      --themeDark: #005a9e;
      --themeDarker: #004578;
      --themeLight: #c7e0f4;
      --themeLighter: #deecf9;
      --themeLighterAlt: #eff6fc;
      --neutralPrimary: #323130;
      --neutralSecondary: #605e5c;
      --neutralTertiary: #a19f9d;
      --neutralQuaternary: #d2d0ce;
      --neutralLight: #edebe9;
      --neutralLighter: #f3f2f1;
      --neutralLighterAlt: #faf9f8;
      --white: #ffffff;
      --elevation4: 0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108);
      --elevation8: 0 3.2px 7.2px 0 rgba(0,0,0,.132), 0 0.6px 1.8px 0 rgba(0,0,0,.108);
      --elevation16: 0 6.4px 14.4px 0 rgba(0,0,0,.132), 0 1.2px 3.6px 0 rgba(0,0,0,.108);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body.ms-Fabric {
      font-family: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      background-color: var(--neutralLighterAlt);
      color: var(--neutralPrimary);
      min-height: 100vh;
      padding: 24px;
    }

    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--neutralLight);
    }

    .page-header-icon {
      width: 48px;
      height: 48px;
      background-color: var(--themePrimary);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-header-icon .ms-Icon {
      font-size: 24px;
      color: var(--white);
    }

    .page-header-text h1 {
      font-size: 28px;
      font-weight: 600;
      color: var(--neutralPrimary);
      margin: 0;
    }

    .page-header-text p {
      font-size: 14px;
      color: var(--neutralSecondary);
      margin: 4px 0 0;
    }

    .cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .ms-DocumentCard {
      background-color: var(--white);
      border-radius: 2px;
      box-shadow: var(--elevation4);
      overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .ms-DocumentCard:hover {
      box-shadow: var(--elevation8);
      transform: translateY(-2px);
    }

    .ms-DocumentCard-preview {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      gap: 12px;
    }

    .ms-DocumentCard-preview .ms-Icon {
      font-size: 32px;
      color: var(--white);
    }

    .ms-DocumentCard-preview .preview-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--white);
    }

    .ms-DocumentCard-preview .duration-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background-color: rgba(0, 0, 0, 0.3);
      color: var(--white);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .ms-DocumentCard-details {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ms-DocumentCard-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--neutralPrimary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .ms-DocumentCard-activity {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .ms-DocumentCard-activity .activity-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ms-DocumentCard-activity .activity-icon .ms-Icon {
      font-size: 14px;
      color: var(--neutralSecondary);
    }

    .ms-DocumentCard-activity .activity-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .ms-DocumentCard-activity .activity-name {
      font-size: 13px;
      color: var(--neutralPrimary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ms-DocumentCard-activity .activity-status {
      font-size: 12px;
      color: var(--themePrimary);
      font-weight: 600;
    }

    .ms-DocumentCard-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--neutralLight);
      background-color: var(--neutralLighterAlt);
    }

    .organizer-info {
      flex: 1;
      min-width: 0;
    }

    .ms-Persona {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ms-Persona-imageArea {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ms-Persona-initials {
      font-size: 12px;
      font-weight: 600;
      color: var(--white);
    }

    .ms-Persona-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .ms-Persona-primaryText {
      font-size: 13px;
      font-weight: 600;
      color: var(--neutralPrimary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ms-Persona-secondaryText {
      font-size: 11px;
      color: var(--neutralSecondary);
    }

    .ms-Button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border: none;
      border-radius: 2px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.1s ease;
      flex-shrink: 0;
    }

    .ms-Button--primary {
      background-color: var(--themePrimary);
      color: var(--white);
    }

    .ms-Button--primary:hover {
      background-color: var(--themeDark);
    }

    .ms-Button--primary:active {
      background-color: var(--themeDarker);
    }

    .ms-Button .ms-Icon {
      font-size: 14px;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background-color: var(--white);
      border-radius: 2px;
      box-shadow: var(--elevation4);
    }

    .empty-state .ms-Icon {
      font-size: 48px;
      color: var(--neutralTertiary);
      margin-bottom: 16px;
    }

    .empty-state h2 {
      font-size: 20px;
      font-weight: 600;
      color: var(--neutralPrimary);
      margin-bottom: 8px;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--neutralSecondary);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      body.ms-Fabric {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .page-header-text h1 {
        font-size: 24px;
      }

      .cards-container {
        grid-template-columns: 1fr;
      }

      .ms-DocumentCard-footer {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .ms-Button {
        justify-content: center;
      }
    }

    /* Microsoft 365 navigation bar styling */
    .ms-nav-bar {
      background-color: var(--themePrimary);
      padding: 8px 24px;
      margin: -24px -24px 24px -24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .ms-nav-bar .ms-Icon {
      font-size: 16px;
      color: var(--white);
    }

    .ms-nav-bar-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--white);
    }

    @media (max-width: 768px) {
      .ms-nav-bar {
        margin: -16px -16px 16px -16px;
        padding: 8px 16px;
      }
    }
  </style>
</head>
<body class="ms-Fabric" dir="ltr">
  <div class="page-container">
    <div class="ms-nav-bar">
      <i class="ms-Icon ms-Icon--OutlookLogo" aria-hidden="true"></i>
      <span class="ms-nav-bar-title">Microsoft Graph Calendar</span>
    </div>

    <div class="page-header">
      <div class="page-header-icon">
        <i class="ms-Icon ms-Icon--Calendar" aria-hidden="true"></i>
      </div>
      <div class="page-header-text">
        <h1>Upcoming Meetings</h1>
        <p>${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} scheduled</p>
      </div>
    </div>

    ${meetings.length > 0 ? `
    <div class="cards-container">
      ${meetingCards}
    </div>
    ` : `
    <div class="empty-state">
      <i class="ms-Icon ms-Icon--Calendar" aria-hidden="true"></i>
      <h2>No upcoming meetings</h2>
      <p>Your calendar is clear. Enjoy your free time!</p>
    </div>
    `}
  </div>

  <script>
    // Handle copy link button clicks
    document.querySelectorAll('.copy-link').forEach(function(button) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        var url = this.getAttribute('data-url');
        var buttonSpan = this.querySelector('span');
        var buttonIcon = this.querySelector('i');
        var originalText = buttonSpan.textContent;
        var originalIconClass = buttonIcon.className;
        
        // Try to copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function() {
            // Success - show feedback
            buttonSpan.textContent = 'Copied!';
            buttonIcon.className = 'ms-Icon ms-Icon--CheckMark';
            
            setTimeout(function() {
              buttonSpan.textContent = originalText;
              buttonIcon.className = originalIconClass;
            }, 2000);
          }).catch(function() {
            // Clipboard API failed, try fallback
            fallbackCopy(url, buttonSpan, buttonIcon, originalText, originalIconClass);
          });
        } else {
          // Fallback for older browsers
          fallbackCopy(url, buttonSpan, buttonIcon, originalText, originalIconClass);
        }
      });
    });
    
    function fallbackCopy(text, buttonSpan, buttonIcon, originalText, originalIconClass) {
      var textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        buttonSpan.textContent = 'Copied!';
        buttonIcon.className = 'ms-Icon ms-Icon--CheckMark';
      } catch (err) {
        buttonSpan.textContent = 'Failed';
      }
      
      document.body.removeChild(textArea);
      
      setTimeout(function() {
        buttonSpan.textContent = originalText;
        buttonIcon.className = originalIconClass;
      }, 2000);
    }
  </script>
</body>
</html>
  `.trim();
};
