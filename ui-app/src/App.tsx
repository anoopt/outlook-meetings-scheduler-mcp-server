import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { UpcomingEvents } from './components/UpcomingEvents';
import { PeopleCard } from './components/PeopleCard';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/events" element={<UpcomingEvents />} />
          <Route path="/people" element={<PeopleCard />} />
          <Route path="/" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </FluentProvider>
  );
}

export default App;
