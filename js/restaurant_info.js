import DBHelper from './dbhelper';

let restaurant;
let newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYmFyYmlldHVubmllIiwiYSI6ImNqbXVleHNjcjBlMjIzcW84YmdqdW9iNGUifQ.H_GxaSKq45_j20CJGvuFug',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(self.newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }

    manageFocus();
  });
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      if (!restaurant) {
        console.error(error);
        return;
      }

      // Fetch the reviews belonging to the restaurant
      DBHelper.fetchReviewsByRestaurantId(id, (error, reviews) => {
        if (error) {
          callback(error, null);
          return;
        }

        restaurant.reviews = reviews;
        self.restaurant = restaurant;

        fillRestaurantHTML();
        callback(null, restaurant);
      });
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.srcset = DBHelper.srcsetForRestaurant(restaurant);
  image.sizes = '(max-width: 699px) 100vw, (min-width: 700px) 50vw, (min-width: 1050px) 33vw, (min-width: 1400px) 25vw';
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();

  // Register form submission handler
  registerReviewFormHandler(restaurant);
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.insertBefore(title, ul);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.id = 'no-reviews';
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Adds a new review to the reviews on the webpage
 */
const updateReviewsHTML = (review) => {
  const container = document.getElementById('reviews-container');
  
  // If the reviews list currently displays the 'No reviews yet' message,
  // remove it
  const noReviewsElement = container.querySelector('#no-reviews');
  if(noReviewsElement) {
    container.removeChild(noReviewsElement);
  }

  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(review));
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.createdAt;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Prevent tabbing to markers, leaflet links and zoom buttons
 */
const manageFocus = () => {
  const unfocusableElementsString = '.leaflet-container, .leaflet-control-attribution a, .leaflet-control-zoom a';

  // Turn off tabbing on the leaflet links, zoom buttons
  [...document.querySelectorAll(unfocusableElementsString)].forEach(el => {
    el.tabIndex = '-1';
  });
};

const registerReviewFormHandler = (restaurant = self.restaurant) => {
  const form = document.querySelector('#review-form');

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();

    const formFieldSelectors = ['#name', '#rating', '#comments'];
    const formElements = document.querySelectorAll(formFieldSelectors);

    // Convert NodeList to Array
    const fieldsArr = Array.prototype.slice.apply(formElements);

    const data = {
      restaurant_id: restaurant.id,
      name: fieldsArr[0].value,
      rating: fieldsArr[1].value,
      comments: fieldsArr[2].value
    };

    // Post the review if the user is connected online,
    // otherwise, save the record locally
    if(!navigator.onLine) {
      // Include the date the review was saved, to use for sorting later
      data.createdAt = Date.now();

      // Save to database for later retry
      DBHelper.storeReviewOffline(data);

      // Update page
      updateReviewsHTML(data);

      // Clear fields
      fieldsArr.forEach(field => field.value = '');
      return;
    }

    const options = {
      method: 'POST',
      mode: 'cors', // no-cors, cors, same-origin
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

    // Post review
    fetch('http://localhost:1337/reviews/', options)
        .then(response => response.json())
        .then(review => {
          // Save the stored review locally
          DBHelper.saveReview(review);

          // Update the view
          updateReviewsHTML(review);
        })
        .catch(error => console.error(error));

    // Clear fields
    fieldsArr.forEach(field => field.value = '');
  }, false);
};