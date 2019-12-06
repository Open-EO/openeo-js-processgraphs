const Utils = require('../utils.js');

var MigrateCollections = {

    // Always returns a copy of the input collection object
    convertCollectionToLatestSpec(originalCollection, version) {
        if (!version || typeof version !== 'string') {
            throw new Error("No version specified");
        }
        if (Utils.compareVersion(version, "0.5.x") >= 0) {
            throw "Migrating collections from API version 0.4.0 is not supported yet";
        }
        var collection = Object.assign({}, originalCollection);
        if (!Object.keys(collection).length) {
            return collection;
        }
        // convert v0.3 processes to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            // name => id
            collection.id = collection.name;
            delete collection.name;

            // Add stac_version
            collection.stac_version = '0.6.1';
            // Rename provider => providers
            if (Array.isArray(collection.provider)) {
                collection.providers = collection.provider;
                delete collection.provider;
            }
            if (typeof collection.properties !== 'object') {
                collection.properties = {};
            }
            // Migrate eo:bands
            if (collection['eo:bands'] !== null && typeof collection['eo:bands'] === 'object' && !Array.isArray(collection['eo:bands'])) {
                var bands = [];
                for(let key in collection['eo:bands']) {
                    var band = Object.assign({}, collection['eo:bands'][key]);
                    band.name = key;
                    if (typeof band.resolution !== 'undefined' && typeof band.gsd === 'undefined') {
                        band.gsd = band.resolution;
                        delete band.resolution;
                    }
                    if (typeof band.wavelength !== 'undefined' && typeof band.center_wavelength === 'undefined') {
                        band.center_wavelength = band.wavelength;
                        delete band.wavelength;
                    }
                    bands.push(band);
                }
                collection['eo:bands'] = bands;
            }
            // Move all other properties into properties.
            for (let key in collection) {
                if (key.includes(':')) {
                    collection.properties[key] = collection[key];
                    delete collection[key];
                }
            }
        }
        return collection;
    }

};

module.exports = MigrateCollections;