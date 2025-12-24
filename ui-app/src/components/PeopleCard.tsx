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
  personCard: {
    padding: tokens.spacingVerticalS,
  },
  personHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  personDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalS,
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
  noPeople: {
    padding: tokens.spacingVerticalM,
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
  photoDataUrl?: string | null;
}

// API base URL - defaults to localhost:3000 for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function PeopleCard() {
  const styles = useStyles();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // First try to get data via dataId (new approach)
      const dataId = urlParams.get('dataId');
      if (dataId) {
        try {
          console.log(`Fetching people data from API with dataId: ${dataId}`);
          const response = await fetch(`${API_BASE_URL}/api/data?id=${dataId}`);
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          const fetchedPeople = await response.json();
          console.log('Fetched people data:', fetchedPeople);
          fetchedPeople.forEach((person: Person) => {
            console.log(`Person: ${person.displayName}, photoDataUrl: ${person.photoDataUrl ? person.photoDataUrl.substring(0, 100) + '...' : 'none'}`);
          });
          setPeople(fetchedPeople);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Error fetching people from API:', err);
          setError('Failed to fetch people data from server');
          setLoading(false);
          return;
        }
      }
      
      // Fallback to URL-embedded data (legacy approach)
      const peopleData = urlParams.get('people');
      if (!peopleData) {
        setError('No people data provided');
        setLoading(false);
        return;
      }

      try {
        const parsedPeople = JSON.parse(decodeURIComponent(peopleData));
        console.log('Parsed people data (legacy):', parsedPeople);
        setPeople(parsedPeople);
      } catch (err) {
        setError('Failed to parse people data');
        console.error('Error parsing people:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
    return person.mail || person.userPrincipalName || 'Email not provided';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(n => n.length > 0)
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
              image={person.photoDataUrl ? { src: person.photoDataUrl } : undefined}
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
