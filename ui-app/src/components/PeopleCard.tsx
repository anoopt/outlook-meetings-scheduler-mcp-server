import { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Body1,
  Caption1,
  makeStyles,
  tokens,
  Spinner,
  Avatar,
} from '@fluentui/react-components';
import {
  Mail24Regular,
  Phone24Regular,
  Building24Regular,
  PersonCircle24Regular,
} from '@fluentui/react-icons';

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
  personCard: {
    padding: tokens.spacingVerticalL,
  },
  personHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  personDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
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
  noPeople: {
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface Person {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  businessPhones?: string[];
}

export function PeopleCard() {
  const styles = useStyles();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse people data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const peopleData = urlParams.get('people');

    if (!peopleData) {
      setError('No people data provided');
      setLoading(false);
      return;
    }

    try {
      const parsedPeople = JSON.parse(decodeURIComponent(peopleData));
      setPeople(parsedPeople);
    } catch (err) {
      setError('Failed to parse people data');
      console.error('Error parsing people:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading people..." size="large" />
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

  if (people.length === 0) {
    return (
      <div className={styles.noPeople}>
        <Text size={500}>No people found</Text>
      </div>
    );
  }

  const getEmail = (person: Person) => {
    return person.mail || person.userPrincipalName || 'No email available';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={styles.container}>
      <Text className={styles.title}>People</Text>
      
      {people.map((person) => (
        <Card key={person.id} className={styles.personCard}>
          <div className={styles.personHeader}>
            <Avatar
              name={person.displayName}
              initials={getInitials(person.displayName)}
              size={56}
              color="colorful"
            />
            <div>
              <Text weight="semibold" size={500}>{person.displayName}</Text>
              {person.jobTitle && (
                <Caption1 block>{person.jobTitle}</Caption1>
              )}
            </div>
          </div>
          
          <div className={styles.personDetails}>
            <div className={styles.detailRow}>
              <Mail24Regular className={styles.icon} />
              <Body1>{getEmail(person)}</Body1>
            </div>
            
            {person.businessPhones && person.businessPhones.length > 0 && (
              <div className={styles.detailRow}>
                <Phone24Regular className={styles.icon} />
                <Body1>{person.businessPhones[0]}</Body1>
              </div>
            )}
            
            {person.department && (
              <div className={styles.detailRow}>
                <Building24Regular className={styles.icon} />
                <Body1>{person.department}</Body1>
              </div>
            )}
            
            {person.officeLocation && (
              <div className={styles.detailRow}>
                <PersonCircle24Regular className={styles.icon} />
                <Body1>{person.officeLocation}</Body1>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
