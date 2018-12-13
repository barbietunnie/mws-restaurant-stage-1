registerServiceWorker = () => {
    if (!navigator.serviceWorker) return;

    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js');

        // Ensure refresh is only called once.
        // This works around a bug in "force update on reload".
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    });
};

registerServiceWorker();