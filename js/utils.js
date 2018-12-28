import DBHelper from './dbhelper';
import uuid from "uuid";

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

const postReview = (review) => {
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
};

const syncData = (request) => {
    const networkStatus = navigator.onLine;

    // Notify user of network status
    if (networkStatus) {
        showNotification('You are now connected!');
        setTimeout(hideNotification, 3000); // hide the 'Connected' notification
    } else {
        showNotification('You are currently offline!');
    }

    if (networkStatus) {
        // Post pending reviews, if network connection is available
        DBHelper.fetchUnsubmittedReviews((error, reviews) => {
            // Post the reviews to the server, and delete them from the local reviews store if successful
            reviews.slice().map(review => {
                delete review.createdAt;
                return review;
            }).forEach(review => postReview(review));
        });

        // Post the pending favorites, if network connection is available
        DBHelper.fetchUnsubmittedFavorites((error, restaurants) => {
            // Post the favorites to the server, and delete from local database if successful
            restaurants.forEach(restaurant => {
                setFavorite(restaurant, restaurant.is_favorite)
                    .then(() => {
                        DBHelper.removeSubmittedFavorite(restaurant.id);
                        DBHelper.updateRestaurant(restaurant);
                    });
            });
        });

    }
};

const setFavorite = (restaurant, favorite) => {
    const options = {
        method: 'PUT',
        mode: 'cors', // no-cors, cors, same-origin
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Post the record to the server
    return fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${favorite}`, options)
        .then(response => response.json())
        .then(res => {
            // Update the local database
            DBHelper.updateRestaurant(res);
            return res;
        })
        .catch(error => {
            console.error(error);
            return false;
        });
};

/**
 * Mark the specified restaurant as a favorite
 * @param restaurant
 */
export const addToFavorites = (restaurant) => {
    setFavorite(restaurant, true);
};

/**
 * Remove the specified restaurant from the list of favorites
 * @param restaurant
 */
export const removeFromFavorites = (restaurant) => {
    setFavorite(restaurant, false);
};

/**
 * Favorite button handler
 *
 * @param favoriteBtn
 * @param restaurant
 */
export const onFavoriteBtnClicked = (favoriteBtn, restaurant) => {
    const markAsFavorite = favoriteBtn.innerHTML.toLowerCase() === 'add to favorites';

    // If user is offline, save the intent locally for subsequent syncing
    if(!navigator.onLine) {
        const restaurantCopy = Object.assign({}, restaurant);
        restaurantCopy.is_favorite = markAsFavorite;
        DBHelper.storeFavorite(restaurantCopy)
            .then(() => {
                toggleFavoriteButton(favoriteBtn.id, markAsFavorite);
            });

        return;
    }

    if (favoriteBtn.innerText.toLowerCase() === 'add to favorites') {
        addToFavorites(restaurant);
    } else {
        removeFromFavorites(restaurant);
    }
    toggleFavoriteButton(favoriteBtn.id, markAsFavorite);
};

/**
 * Update the state of the specified button
 * @param btnId The button id
 * @param markAsFavorite Add to favorites
 */
const toggleFavoriteButton = (btnId, markAsFavorite) => {
    const btn = document.getElementById(btnId);
    btn.innerHTML = markAsFavorite ? 'Remove from Favorites' : 'Add to Favorites';
}


const showNotification = (message) => {
    const notification = document.getElementById('notification');
    notification.innerHTML = message;
    notification.classList.remove('hide');
    notification.setAttribute('aria-hidden', false);
};

const hideNotification = () => {
    const notification = document.getElementById('notification');
    notification.innerHTML = '';
    notification.classList.add('hide');
    notification.setAttribute('aria-hidden', true);
};

window.addEventListener('online', syncData);
window.addEventListener('offline', syncData);

const initApp = () => {
    DBHelper.openDatabase();
    registerServiceWorker();
};



initApp();