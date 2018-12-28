import DBHelper from './dbhelper';

const registerServiceWorker = () => {
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

function syncReview(request) {
    const networkStatus = navigator.onLine;

    console.log(`Network status: ${networkStatus}`);

    // TODO: Notify user of network status

    // Post pending reviews, if network connection is available
    if (networkStatus) {
        DBHelper.fetchUnsubmittedReviews((error, reviews) => {
            console.log('Loaded unsubmitted reviews: ', reviews);

            // Post the reviews to the server, and delete them from the local reviews store if successful
            reviews.slice().map(review => {
                delete review.createdAt;
                return review;
            }).forEach(review => {
                const postReview = Object.assign({}, review); // clone the review
                if (postReview.uid)
                    delete postReview.uid;

                // Send the offline reviews to the server
                const options = {
                    method: 'POST',
                    mode: 'cors', // no-cors, cors, same-origin
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(postReview)
                };

                // Post the record to the server
                fetch('http://localhost:1337/reviews/', options)
                    .then(response => response.json())
                    .then(subReview => {
                        // Save the stored review locally
                        DBHelper.saveReview(subReview);

                        DBHelper.removeUnsubmittedReview(review.uid);
                    })
                    .catch(error => console.error(error));
            });
        });

    }
}

window.addEventListener('online', syncReview);
window.addEventListener('offline', syncReview);

const initApp = () => {
    DBHelper.openDatabase();
    registerServiceWorker();
};

initApp();