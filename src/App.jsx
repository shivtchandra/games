import React, { useEffect, useState } from 'react';
import StraitOfChaos from './StraitOfChaos';
import AdminPanel from './AnalyticsDashboard';
import { trackPageVisit } from './analytics';

function App() {
    const [route, setRoute] = useState(window.location.hash);

    useEffect(() => {
        trackPageVisit();
    }, []);

    useEffect(() => {
        const onHash = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    if (route === '#admin') {
        return <AdminPanel />;
    }

    return <StraitOfChaos />;
}

export default App;
