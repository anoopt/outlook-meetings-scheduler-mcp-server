import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Body1,
  makeStyles,
  tokens,
  Spinner,
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
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXXL,
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalL,
  },
  eventCard: {
    padding: tokens.spacingVerticalL,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  icon: {
    color: tokens.colorBrandForeground1,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  errorContainer: {
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorPaletteRedForeground1,
  },
  noEvents: {
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface Event {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
}

export function UpcomingEvents() {
  const styles = useStyles();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse events data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventsData = urlParams.get('events');

    if (!eventsData) {
      setError('No events data provided');
      setLoading(false);
      return;
    }

    try {
      const parsedEvents = JSON.parse(decodeURIComponent(eventsData));
      setEvents(parsedEvents);
    } catch (err) {
      setError('Failed to parse events data');
      console.error('Error parsing events:', err);
    } finally {
      setLoading(false);
    }
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
                {formatDateTime(event.start.dateTime)} - {formatDateTime(event.end.dateTime)}
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
                <Body1>
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                </Body1>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
