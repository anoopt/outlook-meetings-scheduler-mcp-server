import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Body1,
  makeStyles,
  tokens,
  Spinner,
  AvatarGroup,
  AvatarGroupItem,
  AvatarGroupPopover,
  partitionAvatarGroupItems,
} from '@fluentui/react-components';
import {
  Calendar24Regular,
  Clock24Regular,
  Location24Regular,
  People24Regular,
} from '@fluentui/react-icons';
import { format, parseISO } from 'date-fns';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalM,
    boxSizing: 'border-box',
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalS,
  },
  eventCard: {
    padding: tokens.spacingVerticalS,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  icon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100px',
  },
  errorContainer: {
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
    color: tokens.colorPaletteRedForeground1,
  },
  noEvents: {
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  avatarGroup: {
    marginLeft: tokens.spacingHorizontalS,
  },
});

interface Attendee {
  name: string;
  email: string;
  photoDataUrl?: string | null;
}

interface Event {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: {
    displayName: string;
  };
  attendeeCount?: number;
  attendees?: Attendee[];
}

// API base URL - defaults to localhost:3000 for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function UpcomingEvents() {
  const styles = useStyles();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // First try to get data via dataId (new approach)
      const dataId = urlParams.get('dataId');
      if (dataId) {
        try {
          console.log(`Fetching events data from API with dataId: ${dataId}`);
          const response = await fetch(`${API_BASE_URL}/api/data?id=${dataId}`);
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          const fetchedEvents = await response.json();
          console.log('Fetched events data:', fetchedEvents);
          fetchedEvents.forEach((event: Event) => {
            console.log(`Event: ${event.subject}, attendees:`, event.attendees?.map(a => ({
              name: a.name,
              photoDataUrl: a.photoDataUrl ? a.photoDataUrl.substring(0, 100) + '...' : 'none'
            })));
          });
          setEvents(fetchedEvents);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error fetching events from API:', err);
          setError('Failed to fetch events data from server');
          setLoading(false);
          return;
        }
      }
      
      // Fallback to URL-embedded data (legacy approach)
      const eventsData = urlParams.get('events');
      if (!eventsData) {
        setError('No events data provided');
        setLoading(false);
        return;
      }

      try {
        const parsedEvents = JSON.parse(decodeURIComponent(eventsData));
        console.log('Parsed events data (legacy):', parsedEvents);
        setEvents(parsedEvents);
      } catch (err) {
        setError('Failed to parse events data');
        console.error('Error parsing events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = parseISO(dateTimeStr);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (err) {
      return dateTimeStr;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading events..." size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Text size={500}>{error}</Text>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.noEvents}>
        <Text size={500}>No upcoming events</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Text className={styles.title}>Upcoming Events</Text>
      
      {events.map((event) => (
        <Card key={event.id} className={styles.eventCard}>
          <CardHeader
            header={<Text weight="semibold" size={500}>{event.subject}</Text>}
          />
          
          <div className={styles.eventDetails}>
            <div className={styles.detailRow}>
              <Calendar24Regular className={styles.icon} />
              <Body1>{formatDateTime(event.start.dateTime)}</Body1>
            </div>
            
            <div className={styles.detailRow}>
              <Clock24Regular className={styles.icon} />
              <Body1>
                Until {formatDateTime(event.end.dateTime)}
              </Body1>
            </div>
            
            {event.location?.displayName && (
              <div className={styles.detailRow}>
                <Location24Regular className={styles.icon} />
                <Body1>{event.location.displayName}</Body1>
              </div>
            )}
            
            {event.attendees && event.attendees.length > 0 && (
              <div className={styles.detailRow}>
                <People24Regular className={styles.icon} />
                <Body1>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</Body1>
                <AttendeeAvatarGroup attendees={event.attendees} />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// Helper function to trigger find-person tool via postMessage
function triggerFindPerson(name: string) {
  console.log(`Triggering find-person for: ${name}`);
  window.parent.postMessage({
    type: 'tool',
    payload: {
      toolName: 'find-person',
      params: { name }
    }
  }, '*');
}

// Component to render attendee avatars as a stack with click functionality
function AttendeeAvatarGroup({ attendees }: { attendees: Attendee[] }) {
  const styles = useStyles();
  
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({
    items: attendees.map(a => a.name),
    maxInlineItems: 4,
  });

  return (
    <AvatarGroup layout="stack" size={28} className={styles.avatarGroup}>
      {inlineItems.map((name, index) => {
        const attendee = attendees.find(a => a.name === name);
        return (
          <AvatarGroupItem
            key={attendee?.email || index}
            name={name}
            image={attendee?.photoDataUrl ? { src: attendee.photoDataUrl } : undefined}
            onClick={() => triggerFindPerson(name)}
            style={{ cursor: 'pointer' }}
          />
        );
      })}
      {overflowItems && overflowItems.length > 0 && (
        <AvatarGroupPopover>
          {overflowItems.map((name, index) => {
            const attendee = attendees.find(a => a.name === name);
            return (
              <AvatarGroupItem
                key={attendee?.email || `overflow-${index}`}
                name={name}
                image={attendee?.photoDataUrl ? { src: attendee.photoDataUrl } : undefined}
                onClick={() => triggerFindPerson(name)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </AvatarGroupPopover>
      )}
    </AvatarGroup>
  );
}
