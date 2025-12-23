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
 * Generate a single persona list item HTML (Fluent UI Persona style)
 */
const generatePersonaListItem = (person: any): string => {
  const displayName = escapeHtml(person.displayName || 'Unknown');
  const email = escapeHtml(person.mail || person.userPrincipalName || person.emailAddresses?.[0]?.address || '');
  const jobTitle = escapeHtml(person.jobTitle || '');
  const officeLocation = escapeHtml(person.officeLocation || '');
  const photoDataUrl = person.photoDataUrl || '';
  
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(email || displayName);

  // Build secondary text (job title)
  const secondaryText = jobTitle || '';
  
  // Build tertiary text (location)
  const tertiaryText = officeLocation || '';

  // Avatar HTML - use photo if available, otherwise initials
  const avatarHtml = photoDataUrl 
    ? `<img class="ms-Persona-image" src="${photoDataUrl}" alt="${displayName}" />`
    : `<span class="ms-Persona-initials">${initials}</span>`;

  return `
    <div class="ms-Persona ms-Persona--size72">
      <div class="ms-Persona-imageArea" style="background-color: ${avatarColor}">
        ${avatarHtml}
      </div>
      <div class="ms-Persona-details">
        <div class="ms-Persona-primaryText">${displayName}</div>
        ${secondaryText ? `<div class="ms-Persona-secondaryText">${secondaryText}</div>` : ''}
        ${tertiaryText ? `<div class="ms-Persona-tertiaryText"><i class="ms-Icon ms-Icon--POI" aria-hidden="true"></i> ${tertiaryText}</div>` : ''}
        ${email ? `<div class="ms-Persona-optionalText"><a href="mailto:${email}">${email}</a></div>` : ''}
      </div>
    </div>
  `;
};

/**
 * Generate HTML for people search results as a vertical list of persona cards
 * Creates a list view matching Microsoft Fluent UI Persona styling
 * @param people - Array of person objects from Graph API
 * @param searchTerm - The search term used to find these people
 * @returns Complete HTML page with persona list
 */
export const generatePersonaCardsHTML = (people: any[], searchTerm: string): string => {
  const listHtml = people.map(person => generatePersonaListItem(person)).join('');

  return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>People Search Results - Microsoft Graph</title>
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
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body.ms-Fabric {
      font-family: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      background-color: var(--white);
      color: var(--neutralPrimary);
      padding: 0;
    }

    .page-container {
      width: 100%;
      max-width: 100%;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
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

    /* Persona List Container */
    .persona-list {
      display: flex;
      flex-direction: column;
      background-color: var(--white);
      overflow: hidden;
    }

    /* Persona styles - Size 72 (large) */
    .ms-Persona {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background-color: var(--white);
      transition: background-color 0.1s ease;
      border-bottom: 1px solid var(--neutralLight);
    }

    .ms-Persona:last-child {
      border-bottom: none;
    }

    .ms-Persona:hover {
      background-color: var(--neutralLighterAlt);
    }

    .ms-Persona-imageArea {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .ms-Persona-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .ms-Persona-initials {
      font-size: 28px;
      font-weight: 400;
      color: var(--white);
    }

    .ms-Persona-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .ms-Persona-primaryText {
      font-size: 20px;
      font-weight: 600;
      color: var(--neutralPrimary);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ms-Persona-secondaryText {
      font-size: 14px;
      font-weight: 400;
      color: var(--neutralPrimary);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ms-Persona-tertiaryText {
      font-size: 14px;
      font-weight: 400;
      color: var(--neutralSecondary);
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ms-Persona-tertiaryText .ms-Icon {
      font-size: 12px;
      color: var(--neutralTertiary);
    }

    .ms-Persona-optionalText {
      font-size: 12px;
      font-weight: 400;
      color: var(--neutralSecondary);
      line-height: 1.4;
    }

    .ms-Persona-optionalText a {
      color: var(--themePrimary);
      text-decoration: none;
    }

    .ms-Persona-optionalText a:hover {
      text-decoration: underline;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background-color: var(--white);
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

    /* Microsoft 365 navigation bar styling */
    .ms-nav-bar {
      background-color: var(--themePrimary);
      padding: 8px 16px;
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

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .page-header-text h1 {
        font-size: 24px;
      }

      .ms-Persona {
        padding: 12px 16px;
      }

      .ms-Persona-imageArea {
        width: 56px;
        height: 56px;
      }

      .ms-Persona-initials {
        font-size: 22px;
      }

      .ms-Persona-primaryText {
        font-size: 16px;
      }

      .ms-Persona-secondaryText,
      .ms-Persona-tertiaryText {
        font-size: 13px;
      }
    }
  </style>
</head>
<body class="ms-Fabric" dir="ltr">
  <div class="page-container">
    <div class="ms-nav-bar">
      <i class="ms-Icon ms-Icon--OutlookLogo" aria-hidden="true"></i>
      <span class="ms-nav-bar-title">Microsoft Graph People</span>
    </div>

    <div class="page-header">
      <div class="page-header-icon">
        <i class="ms-Icon ms-Icon--People" aria-hidden="true"></i>
      </div>
      <div class="page-header-text">
        <h1>People</h1>
        <p>Found ${people.length} result${people.length !== 1 ? 's' : ''} for "${escapeHtml(searchTerm)}"</p>
      </div>
    </div>

    ${people.length > 0 ? `
    <div class="persona-list">
      ${listHtml}
    </div>
    ` : `
    <div class="empty-state">
      <i class="ms-Icon ms-Icon--People" aria-hidden="true"></i>
      <h2>No people found</h2>
      <p>No results matching "${escapeHtml(searchTerm)}". Try a different search term.</p>
    </div>
    `}
  </div>
</body>
</html>
  `.trim();
};
