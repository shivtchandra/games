import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
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
        return <><AdminPanel /><Analytics /></>;
    }

    return <><StraitOfChaos /><Analytics /></>;
}

export default App;
