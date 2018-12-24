import idb from 'idb';

/**
 * Common database helper functions.
 */
export default class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get RESTAURANTS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Database name
   */
  static get DATABASE_NAME() {
    return 'restaurants';
  }

  /**
   * Database version
   */
  static get DATABASE_VERSION() {
    return 3;
  }

  /**
   * Restaurant object store name
   */
  static get RESTAURANT_OBJECT_STORE() {
    return 'restaurants';
  }

  /**
   * Reviews object store name
   */
  static get REVIEWS_OBJECT_STORE() {
    return 'reviews';
  }

  /**
   * Offline data object store name
   */
  static get LOCAL_REVIEWS_OBJECT_STORE() {
    return 'local';
  }

  /**
   * Offline favorites object store name
   */
  static get LOCAL_FAVORITES_OBJECT_STORE() {
    return 'favorites';
  }

  static openDatabase() {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(DBHelper.DATABASE_NAME, DBHelper.DATABASE_VERSION, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0: upgradeDb.createObjectStore(DBHelper.RESTAURANT_OBJECT_STORE, {
                  keyPath: 'id'
                });
        case 1: upgradeDb.createObjectStore(
                              DBHelper.REVIEWS_OBJECT_STORE,
              { keyPath: 'id' }
                          );
                const localStore = upgradeDb.createObjectStore(
                                DBHelper.LOCAL_REVIEWS_OBJECT_STORE,
                                { autoIncrement: true }
                          );
                localStore.createIndex('creationDate', 'date');
                upgradeDb.createObjectStore(
                                DBHelper.LOCAL_FAVORITES_OBJECT_STORE,
                                { autoIncrement: true }
                                );
        case 2: const reviewsStore = upgradeDb.transaction.objectStore(DBHelper.REVIEWS_OBJECT_STORE);
                reviewsStore.createIndex('restaurant', 'restaurant_id');
      }

    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    const dbHandle = DBHelper.openDatabase();
    dbHandle.then(db => {
      if(!db)
        return;

      let allRestaurants = [];
      db.transaction(DBHelper.DATABASE_NAME)
          .objectStore(DBHelper.RESTAURANT_OBJECT_STORE)
          .getAll()
          .then(restaurantsInDB => {
            if (restaurantsInDB) {
              allRestaurants = restaurantsInDB.slice();
            }

            // to avoid retrieving only a subset of what's available online,
            // also make a network request to fetch all records
            fetch(`${DBHelper.RESTAURANTS_URL}`)
                .then(response => response.json())
                .then(restaurants => {
                  const store = db.transaction(DBHelper.DATABASE_NAME, 'readwrite')
                      .objectStore(DBHelper.RESTAURANT_OBJECT_STORE)
                  restaurants.filter(restaurant => !allRestaurants.map(ar => ar.id).includes(restaurant.id))
                      .forEach(restaurant => {
                        store.put(restaurant);
                        allRestaurants.push(restaurant);
                      });

                  if (!allRestaurants) {
                    callback('No restaurants found', null);
                    return;
                  }

                  callback(null, allRestaurants);
                })
                .catch(error => {
                  // const error = (`Request failed. Returned status of ${xhr.status}`);
                  callback(error, null);
                });
          });

    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // Lookup database for record with the specified ID
    const dbHandle = DBHelper.openDatabase();
    dbHandle.then(db => {
      if(!db)
        return;

      db.transaction(DBHelper.DATABASE_NAME)
          .objectStore(DBHelper.RESTAURANT_OBJECT_STORE)
          .get(Number(id))
          .then(restaurant => {
              if (restaurant) {
                callback(null, restaurant);
                return;
              }

              fetch(`${DBHelper.RESTAURANTS_URL}/${id}`)
                  .then(response => response.json())
                  .then(restaurant => {
                    if (restaurant) { // Got the restaurant
                      db.transaction(DBHelper.DATABASE_NAME, 'readwrite')
                          .objectStore(DBHelper.RESTAURANT_OBJECT_STORE)
                          .put(restaurant);
                      callback(null, restaurant);
                    } else { // Restaurant does not exist in the database
                      callback('Restaurant does not exist', null);
                    }
                  })
                  .catch(error => {
                    // const error = (`Request failed. Returned status of ${xhr.status}`);
                    callback(error, null);
                  });

            });

    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`${DBHelper.getLowResImageUrl(restaurant)}`);
  }

  /**
   * Srcset for image
   */
  static srcsetForRestaurant(restaurant) {
    return (`${DBHelper.getLowResImageUrl(restaurant)} 400w, ${DBHelper.getHighResImageUrl(restaurant)} 800w`);
  }

  static getLowResImageUrl(restaurant) {
    if (!restaurant.photograph)
      return '';

    return (`/img/${restaurant.photograph.concat('_sm.jpg')}`);
  }

  static getHighResImageUrl(restaurant) {
    if (!restaurant.photograph)
      return '';

    return (`/img/${restaurant.photograph.concat('.jpg')}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      keyboard: false // turn off keyboard focus on markers
      })
      marker.addTo(self.newMap);
    return marker;
  }

  /**
   * Store the review in the database where it can be synced
   * with the server later on
   *
   * @param review
   */
  static storeReviewOffline(review) {
    const dbHandle = DBHelper.openDatabase();
    return dbHandle.then(db => {
      if(!db)
        return;

      const tx = db.transaction(DBHelper.LOCAL_REVIEWS_OBJECT_STORE, 'readwrite');
      const localStore = tx.objectStore(DBHelper.LOCAL_REVIEWS_OBJECT_STORE);
      localStore.put(review);

      return tx.complete;
    });
  }

  /**
   * Save the review
   *
   * @param review
   */
  static saveReview(review) {
    const dbHandle = DBHelper.openDatabase();
    return dbHandle.then(db => {
      if(!db)
        return;

      const tx = db.transaction(DBHelper.REVIEWS_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(DBHelper.REVIEWS_OBJECT_STORE);
      store.put(review);

      return tx.complete;
    });
  }
}